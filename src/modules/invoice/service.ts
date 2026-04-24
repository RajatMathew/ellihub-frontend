import { Invoice, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { InvoiceCreateRequest } from './models';

export const InvoiceService = {
    createInvoice: async (request: InvoiceCreateRequest, userId: string): Promise<Invoice> => {
        const {
            projectId,
            vendorId,
            purchaseOrderId,
            invoiceNumber,
            invoiceDate,
            dueDate,
            totalAmount,
            taxAmount,
            taxRate,
            notes,
            relatedSCOIds,
            attachments,
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (purchaseOrderId) {
            const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
            if (!po) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(po);
            if (po.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to the project');
            }
            if (po.vendorId !== vendorId) {
                throw new BadRequestError('Purchase order does not belong to the vendor');
            }
        }

        if (relatedSCOIds.length) {
            const scos = await prisma.subChangeOrder.findMany({
                where: { id: { in: relatedSCOIds } },
            });
            if (scos.length !== relatedSCOIds.length) {
                throw new NotFoundError('One or more related SCOs not found');
            }
            if (scos.some((s) => s.projectId !== projectId)) {
                throw new BadRequestError('Related SCOs must belong to the same project');
            }
        }

        const files = await prisma.file.findMany({ where: { id: { in: attachments } } });
        if (files.length !== attachments.length) {
            throw new NotFoundError('One or more attachment files not found');
        }

        const duplicate = await prisma.invoice.findUnique({
            where: { invoiceNumber_vendorId: { invoiceNumber, vendorId } },
        });
        if (duplicate) {
            throw new ConflictError('Invoice number already exists for this vendor');
        }

        return await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    id: ulid(),
                    projectId,
                    vendorId,
                    purchaseOrderId: purchaseOrderId ?? null,
                    invoiceNumber,
                    invoiceDate: new Date(invoiceDate),
                    dueDate: new Date(dueDate),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    taxAmount: taxAmount != null ? new Prisma.Decimal(taxAmount) : null,
                    taxRate: taxRate != null ? new Prisma.Decimal(taxRate) : null,
                    notes: notes ?? null,
                    relatedSCOIds,
                    createdBy: userId,
                },
            });

            const folderId = await FileService.getProjectSubFolderId(projectId, 'INVOICE', tx);
            for (const documentId of attachments) {
                await FileService.moveFileToFolder(documentId, folderId, tx);
                await tx.invoiceAttachment.create({
                    data: { id: ulid(), invoiceId: invoice.id, documentId },
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'invoice',
                entityId: invoice.id,
                action: 'create',
                description: `Created invoice ${invoice.invoiceNumber} for vendor ${vendor.name}`,
                affectedEntityIds: [
                    projectId,
                    vendorId,
                    ...(purchaseOrderId ? [purchaseOrderId] : []),
                    ...relatedSCOIds,
                    ...attachments,
                ],
                tx,
            });

            return invoice;
        });
    },
};
