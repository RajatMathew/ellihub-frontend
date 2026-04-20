import { Prisma, PurchaseOrder } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { PoCreateRequest } from './models';
import { generatePoNumber } from './utils';

export const PoService = {
    createPurchaseOrder: async (
        request: PoCreateRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const {
            projectId,
            vendorId,
            rfqId,
            tradeCategoryId,
            expectedDate,
            taxPercent,
            markupAmount,
            retainagePercent,
            lineItems,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create a PO');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (rfqId) {
            const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            if (rfq.projectId !== projectId) {
                throw new BadRequestError('RFQ does not belong to the given project');
            }
        }

        const tradeCategory = await prisma.lookup.findUnique({ where: { id: tradeCategoryId } });
        if (!tradeCategory) throw new NotFoundError('Trade category not found');

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more line item units not found');
        }

        const costCodeIds = [
            ...new Set(lineItems.map((li) => li.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        const lineAmounts = lineItems.map((li) =>
            new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice))
        );
        const subtotal = lineAmounts.reduce((sum, amt) => sum.plus(amt), new Prisma.Decimal(0));
        const taxAmount =
            taxPercent != null
                ? subtotal.times(new Prisma.Decimal(taxPercent)).dividedBy(100)
                : new Prisma.Decimal(0);
        const total = subtotal.plus(taxAmount);

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx, project.jobNumber!);

            const po = await tx.purchaseOrder.create({
                data: {
                    ...rest,
                    id: ulid(),
                    poNumber,
                    projectId,
                    vendorId,
                    rfqId: rfqId ?? null,
                    tradeCategoryId,
                    status: 'DRAFT',
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal,
                    markupAmount: markupAmount ?? null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? taxAmount : null,
                    total,
                    retainagePercent: retainagePercent ?? 0,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: ulid(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: li.description,
                    unitId: li.unitId,
                    quantity: new Prisma.Decimal(li.quantity),
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId ?? null,
                    notes: li.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} on project ${project.name}`,
                tx,
            });

            return po;
        });
    },

    createFromRfq: async (rfqId: string, userId: string): Promise<PurchaseOrder> => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                project: true,
                rfqdeliverables: true,
                vendorQuotes: { where: { isAwarded: true } },
            },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'AWARDED') {
            throw new BadRequestError('RFQ must be AWARDED to generate a PO');
        }
        if (!rfq.awardedVendorId || rfq.awardedAmount === null) {
            throw new BadRequestError('RFQ has no awarded vendor or amount');
        }
        if (!rfq.project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create a PO');
        }
        if (!rfq.rfqdeliverables.length) {
            throw new BadRequestError('RFQ has no deliverables');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: rfq.awardedVendorId } });
        if (!vendor) throw new NotFoundError('Awarded vendor not found');
        checkDeletedAt(vendor);

        const awardedQuote = rfq.vendorQuotes[0];

        const subtotal = new Prisma.Decimal(rfq.awardedAmount);
        const total = subtotal;

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx, rfq.project.jobNumber!);

            const po = await tx.purchaseOrder.create({
                data: {
                    id: ulid(),
                    poNumber,
                    projectId: rfq.projectId,
                    vendorId: rfq.awardedVendorId!,
                    rfqId: rfq.id,
                    tradeCategoryId: rfq.typeId,
                    status: 'DRAFT',
                    description: rfq.description ?? rfq.title,
                    leadTime: awardedQuote?.leadTime ?? null,
                    subtotal,
                    total,
                    paymentTerms: vendor.paymentTerms,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: rfq.rfqdeliverables.map((d, i) => ({
                    id: ulid(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: `Item ${i + 1}`,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    unitPrice: new Prisma.Decimal(0),
                    amount: new Prisma.Decimal(0),
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} from RFQ ${rfq.rfqNumber}`,
                tx,
            });

            return po;
        });
    },
};
