import { POAttachment, Prisma, PurchaseOrder } from '@db/client';
import { AccessContext } from '@lib/access';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { calculateCommercialDocumentTotals, roundMoney } from '@modules/commercial-document/totals';
import { FileService } from '@modules/file/services';
import { PdfNoticeService, type ResolvedPdfNotice } from '@modules/pdf/notice-service';
import { resolvePdfProfile, type PdfProfile } from '@modules/pdf/profile-service';
import {
    PdfTermsService,
    type PdfTermsOption,
    type ResolvedPdfTerms,
} from '@modules/pdf/terms-service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddPoAttachmentRequest,
    GeneratePoPdfRequest,
    PoCreateRequest,
    PoFromRfqRequest,
    PoUpdateRequest,
    RemovePoAttachmentRequest,
    SetPoCancelledRequest,
    SetPoDeliveredRequest,
    SetPoIssuedRequest,
} from './models';
import { generatePoNumber } from './utils';

type PurchaseOrderPdfResult = {
    bytes: Uint8Array;
    fileName: string;
    contentType: string;
    requestHash: string | null;
    cacheHit: boolean;
};

type SavedPurchaseOrderPdfResult = PurchaseOrderPdfResult & {
    savedFileId: string;
    savedAttachmentId: string | null;
};

type PurchaseOrderPdfOrder = Prisma.PurchaseOrderGetPayload<{
    include: {
        project: true;
        vendor: true;
        rfq: true;
        tradeCategory: true;
        lineItems: { include: { unit: true } };
    };
}>;

const PURCHASE_ORDER_PDF_TEMPLATE_ID = 'purchase_order_v1';
const PURCHASE_ORDER_PDF_TERMS_SECTION = 'purchaseOrder';
const PURCHASE_ORDER_PDF_NOTICE_SECTION = 'purchaseOrder';
const FILE_NAME_INVALID_CHARACTERS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
});
const currencyFormatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
});
const quantityFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function assertRfqCanBeLinkedToPurchaseOrder(
    rfq: { projectId: string; status: string },
    projectId: string
) {
    if (rfq.projectId !== projectId) {
        throw new BadRequestError('RFQ does not belong to the given project');
    }
    if (rfq.status !== 'AWARDED') {
        throw new BadRequestError('Only AWARDED RFQs can be linked to a purchase order');
    }
}

function assertPurchaseOrderVendorMatchesAwardedRfq(
    rfq: { awardedVendorId: string | null },
    vendorId: string
) {
    if (!rfq.awardedVendorId) {
        throw new BadRequestError('RFQ has no awarded vendor');
    }
    if (rfq.awardedVendorId !== vendorId) {
        throw new BadRequestError('PO vendor must match the awarded RFQ vendor');
    }
}

function assertRfqDeliverableLineItems(
    rfq: { rfqdeliverables: { id: string; deletedAt: Date | null }[] },
    lineItems: { rfqDeliverableId?: string | null }[]
) {
    const deliverableById = new Map(
        rfq.rfqdeliverables
            .filter((deliverable) => !deliverable.deletedAt)
            .map((deliverable) => [deliverable.id, deliverable])
    );
    const seenDeliverableIds = new Set<string>();

    for (const lineItem of lineItems) {
        if (!lineItem.rfqDeliverableId) continue;

        if (seenDeliverableIds.has(lineItem.rfqDeliverableId)) {
            throw new BadRequestError('Duplicate RFQ deliverable line item submitted');
        }
        seenDeliverableIds.add(lineItem.rfqDeliverableId);

        if (!deliverableById.has(lineItem.rfqDeliverableId)) {
            throw new BadRequestError('Line item does not belong to this RFQ');
        }
    }
}

function formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    return dateFormatter.format(new Date(value));
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
    if (value == null) return 0;
    const numericValue = typeof value === 'number' ? value : Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatQuantity(value: { toString(): string } | null | undefined): string {
    const numericValue = toNumber(value);
    return quantityFormatter.format(numericValue);
}

function formatCurrencyValue(value: { toString(): string } | number | null | undefined): string {
    return currencyFormatter.format(toNumber(value));
}

function formatPercent(value: { toString(): string } | number | null | undefined): string {
    const numericValue = toNumber(value);
    if (numericValue === 0) return '0%';
    return `${quantityFormatter.format(numericValue)}%`;
}

function formatPaymentTerms(value: string | null | undefined): string {
    if (!value) return '';
    if (value === 'DUE_ON_RECEIPT') return 'Due on Receipt';
    return value
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');
}

function sanitizeFileName(value: string): string {
    return (
        Array.from(value)
            .map((character) =>
                FILE_NAME_INVALID_CHARACTERS.has(character) || character.charCodeAt(0) < 32
                    ? '_'
                    : character
            )
            .join('')
            .replace(/\s+/g, ' ')
            .trim() || 'purchase-order.pdf'
    );
}

function formatProjectAddress(project: PurchaseOrderPdfOrder['project']): string {
    return [project.streetAddress, project.city, project.state, project.zipCode]
        .filter(Boolean)
        .join(', ');
}

function buildPurchaseOrderPdfData(
    po: PurchaseOrderPdfOrder,
    requestedBy: string,
    pdfProfile: PdfProfile,
    terms: ResolvedPdfTerms,
    notice: ResolvedPdfNotice
): PdfJsonObject {
    const logoPath = pdfProfile.company.logoPath || 'assets/logo.png';
    const retainagePercent = toNumber(po.retainagePercent);
    const lineAmounts = po.lineItems.map((item) =>
        new Prisma.Decimal(item.quantity ?? 0).times(new Prisma.Decimal(item.unitPrice ?? 0))
    );
    const totals = calculateCommercialDocumentTotals({
        lineAmounts,
        negotiatedDiscount: toNumber(po.negotiatedDiscount),
        shippingHandlingFee: toNumber(po.shippingHandlingFee),
        taxPercent: po.taxPercent == null ? null : toNumber(po.taxPercent),
    });
    const retainageAmount = toNumber(totals.total) * (retainagePercent / 100);

    return {
        company: {
            name: pdfProfile.company.name,
            address_lines: pdfProfile.company.addressLines,
            phone: pdfProfile.company.phone,
            logo_path: logoPath,
        },
        purchase_order: {
            number: po.poNumber,
            description: po.description || '',
            status: po.status,
            issued_on: formatDate(po.issuedAt || po.createdAt || new Date()),
            expected_date: formatDate(po.expectedDate),
            trade_category: po.tradeCategory.label,
            lead_time: po.leadTime || '',
            payment_terms: formatPaymentTerms(po.paymentTerms),
        },
        project: {
            name: po.project.name,
            number: po.project.jobNumber || po.project.contractNumber || '',
            contract_number: po.project.contractNumber || '',
        },
        vendor: {
            name: po.vendor.name,
            address: po.vendor.address || '',
            email: po.vendor.email || '',
            phone: po.vendor.phone || '',
        },
        ship_to: {
            address:
                po.shipToAddress ||
                formatProjectAddress(po.project) ||
                pdfProfile.company.addressLines.join(', '),
        },
        request: {
            requested_by: requestedBy,
        },
        line_items: po.lineItems.map((item, index) => ({
            line_number: String(item.lineNumber || index + 1),
            description: item.description,
            quantity: formatQuantity(item.quantity),
            unit: item.unit.label,
            unit_price: formatCurrencyValue(item.unitPrice),
            amount: formatCurrencyValue(item.amount),
            notes: item.notes || '',
        })),
        line_items_count: String(po.lineItems.length),
        summary: {
            subtotal: formatCurrencyValue(totals.subtotal),
            negotiated_discount: formatCurrencyValue(totals.negotiatedDiscount),
            shipping_and_handling_fee: formatCurrencyValue(totals.shippingHandling),
            tax_label: po.taxPercent ? `Tax (${formatPercent(po.taxPercent)})` : 'Tax',
            tax_amount: formatCurrencyValue(totals.taxAmount),
            total: formatCurrencyValue(totals.total),
            retainage_percent: formatPercent(po.retainagePercent),
            retainage_amount: formatCurrencyValue(retainageAmount),
        },
        terms: {
            included: terms.included,
            html: terms.html,
        },
        notice: {
            included: notice.included,
            title: notice.title,
            html: notice.html,
        },
        footer: {
            left: `${pdfProfile.company.name} - ${po.poNumber}`,
        },
    };
}

function buildPurchaseOrderPdfFileName(po: PurchaseOrderPdfOrder): string {
    return sanitizeFileName(`${po.poNumber || 'purchase-order'}.pdf`);
}

function formatSavedPdfTimestamp(date = new Date()): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    return [
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${milliseconds}`,
    ].join(' ');
}

function buildSavedPurchaseOrderPdfFileName(fileName: string): string {
    const baseName = fileName.toLowerCase().endsWith('.pdf') ? fileName.slice(0, -4) : fileName;
    return sanitizeFileName(`${baseName} - ${formatSavedPdfTimestamp()}.pdf`);
}

async function assertUnitsExist(unitIds: string[]) {
    const uniqueUnitIds = [...new Set(unitIds)];
    const units = await prisma.lookup.findMany({ where: { id: { in: uniqueUnitIds } } });
    if (units.length !== uniqueUnitIds.length) {
        throw new NotFoundError('One or more line item units not found');
    }
}

async function assertCostCodesExist(costCodeIds: string[]) {
    const uniqueCostCodeIds = [...new Set(costCodeIds)];
    const costCodes = await prisma.costCode.findMany({
        where: { id: { in: uniqueCostCodeIds } },
    });
    if (costCodes.length !== uniqueCostCodeIds.length) {
        throw new NotFoundError('One or more cost codes not found');
    }
}

export const PoService = {
    getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                project: true,
                vendor: true,
                rfq: true,
                tradeCategory: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { lineNumber: 'asc' },
                    include: { unit: true },
                },
                attachments: { include: { document: true } },
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        return po;
    },

    getDefaultPdfTerms: async (): Promise<{ html: string }> => {
        return PdfTermsService.getDefaultTerms(PURCHASE_ORDER_PDF_TERMS_SECTION);
    },

    getPdfTermsOptions: async (): Promise<PdfTermsOption[]> => {
        return (await PdfTermsService.getConfig(PURCHASE_ORDER_PDF_TERMS_SECTION)).options;
    },

    generatePdf: async (
        id: string,
        requestedBy: string,
        pdfRequest: GeneratePoPdfRequest
    ): Promise<PurchaseOrderPdfResult> => {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                project: true,
                vendor: true,
                rfq: true,
                tradeCategory: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { lineNumber: 'asc' },
                    include: { unit: true },
                },
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (!po.lineItems.length) {
            throw new BadRequestError(
                'Purchase order must have at least one line item to generate a PDF'
            );
        }

        const fileName = buildPurchaseOrderPdfFileName(po);
        const [pdfProfile, terms, notice] = await Promise.all([
            resolvePdfProfile(),
            PdfTermsService.resolveForRequest(PURCHASE_ORDER_PDF_TERMS_SECTION, pdfRequest),
            PdfNoticeService.resolveForRequest(PURCHASE_ORDER_PDF_NOTICE_SECTION, pdfRequest),
        ]);
        const pdf = await renderPdf({
            template_id: PURCHASE_ORDER_PDF_TEMPLATE_ID,
            data: buildPurchaseOrderPdfData(po, requestedBy, pdfProfile, terms, notice),
            branding: {
                company_name: pdfProfile.company.name,
            },
            settings: {
                filename: fileName,
            },
        });

        return {
            ...pdf,
            fileName,
        };
    },

    savePdf: async (
        id: string,
        requestedBy: string,
        userId: string,
        pdfRequest: GeneratePoPdfRequest
    ): Promise<SavedPurchaseOrderPdfResult> => {
        const pdf = await PoService.generatePdf(id, requestedBy, pdfRequest);
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            select: {
                id: true,
                projectId: true,
                poNumber: true,
                vendorId: true,
                deletedAt: true,
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        const folderId = await FileService.getOrCreateProjectEntityFolder(
            { projectId: po.projectId, entityType: 'PURCHASE_ORDER', entityId: po.id },
            userId
        );
        const savedFileName = buildSavedPurchaseOrderPdfFileName(pdf.fileName);
        const saved = await FileService.saveGeneratedFile(
            {
                name: savedFileName,
                displayName: savedFileName,
                parentId: folderId,
                mimeType: pdf.contentType,
                content: pdf.bytes,
                afterCreate: async (file, tx) => {
                    const attachment = await tx.pOAttachment.create({
                        data: { id: generateNanoId(), purchaseOrderId: po.id, documentId: file.id },
                    });

                    await ActivityLogService.log({
                        userId,
                        entityType: 'purchaseOrder',
                        entityId: po.id,
                        action: 'create',
                        description: `Saved generated PDF ${file.name} to PO ${po.poNumber}`,
                        affectedEntityIds: [file.id, po.projectId, po.vendorId],
                        tx,
                    });

                    return { attachmentId: attachment.id };
                },
            },
            userId
        );

        return {
            ...pdf,
            fileName: saved.file.name,
            savedFileId: saved.file.id,
            savedAttachmentId: saved.result?.attachmentId ?? null,
        };
    },

    getPurchaseOrders: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<{ data: PurchaseOrder[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, vendorId, rfqId, status, tradeCategoryId, ...restFilter } = filter || {};

        const whereClause: Prisma.PurchaseOrderWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(vendorId && { vendorId }),
            ...(rfqId && { rfqId }),
            ...(status && { status }),
            ...(tradeCategoryId && { tradeCategoryId }),
            ...(search && {
                OR: [
                    { poNumber: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const scopedWhereClause: Prisma.PurchaseOrderWhereInput =
            access && access.projectScope !== 'all'
                ? {
                      AND: [
                          whereClause,
                          access.employeeId
                              ? {
                                    project: {
                                        teamMembers: {
                                            some: { employeeId: access.employeeId },
                                        },
                                    },
                                }
                              : { id: { in: [] } },
                      ],
                  }
                : whereClause;

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrder.count({ where: scopedWhereClause }),
            prisma.purchaseOrder.findMany({
                where: scopedWhereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof PurchaseOrder]: sortOrder },
                include: {
                    project: true,
                    vendor: true,
                    tradeCategory: true,
                    subChangeOrders: {
                        where: { deletedAt: null, status: 'APPROVED' },
                        select: {
                            id: true,
                            amount: true,
                            negotiatedDiscount: true,
                            shippingHandlingFee: true,
                            status: true,
                        },
                    },
                },
            }),
        ]);

        return { data, count };
    },

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
            negotiatedDiscount,
            shippingHandlingFee,
            retainagePercent,
            lineItems,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (rfqId) {
            const rfq = await prisma.rFQ.findUnique({
                where: { id: rfqId },
                include: {
                    rfqdeliverables: {
                        select: { id: true, deletedAt: true },
                    },
                },
            });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            assertRfqCanBeLinkedToPurchaseOrder(rfq, projectId);
            assertPurchaseOrderVendorMatchesAwardedRfq(rfq, vendorId);
            assertRfqDeliverableLineItems(rfq, lineItems);
        }

        const tradeCategory = await prisma.lookup.findUnique({ where: { id: tradeCategoryId } });
        if (!tradeCategory) throw new NotFoundError('Trade category not found');

        await assertUnitsExist(lineItems.map((li) => li.unitId));
        await assertCostCodesExist(lineItems.map((li) => li.costCodeId));

        const lineAmounts = lineItems.map((li) =>
            roundMoney(new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice)))
        );
        const totals = calculateCommercialDocumentTotals({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx);

            const po = await tx.purchaseOrder.create({
                data: {
                    ...rest,
                    id: generateNanoId(),
                    poNumber,
                    projectId,
                    vendorId,
                    rfqId: rfqId ?? null,
                    tradeCategoryId,
                    status: 'DRAFT',
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal: totals.subtotal,
                    negotiatedDiscount:
                        negotiatedDiscount != null ? totals.negotiatedDiscount : null,
                    shippingHandlingFee:
                        shippingHandlingFee != null ? totals.shippingHandling : null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? totals.taxAmount : null,
                    total: totals.total,
                    retainagePercent: retainagePercent ?? 0,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: generateNanoId(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: li.description,
                    unitId: li.unitId,
                    quantity: new Prisma.Decimal(li.quantity),
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId,
                    notes: li.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} on project ${project.name}`,
                affectedEntityIds: [projectId, vendorId, ...(rfqId ? [rfqId] : [])],
                tx,
            });

            return po;
        });
    },

    createFromRfq: async (
        rfqId: string,
        request: PoFromRfqRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const {
            description,
            leadTime,
            shipToAddress,
            address,
            expectedDate,
            taxPercent,
            negotiatedDiscount,
            shippingHandlingFee,
            retainagePercent,
            paymentTerms,
            notes,
            lineItems,
        } = request;
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
        if (!rfq.rfqdeliverables.length) {
            throw new BadRequestError('RFQ has no deliverables');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: rfq.awardedVendorId } });
        if (!vendor) throw new NotFoundError('Awarded vendor not found');
        checkDeletedAt(vendor);

        const awardedQuote = rfq.vendorQuotes[0];

        const deliverableById = new Map(
            rfq.rfqdeliverables.map((deliverable) => [deliverable.id, deliverable])
        );
        const seenDeliverableIds = new Set<string>();

        for (const lineItem of lineItems) {
            if (!lineItem.rfqDeliverableId) continue;

            if (seenDeliverableIds.has(lineItem.rfqDeliverableId)) {
                throw new BadRequestError('Duplicate RFQ deliverable line item submitted');
            }
            seenDeliverableIds.add(lineItem.rfqDeliverableId);

            if (!deliverableById.has(lineItem.rfqDeliverableId)) {
                throw new BadRequestError('Line item does not belong to this RFQ');
            }
        }

        await assertUnitsExist(lineItems.map((lineItem) => lineItem.unitId));
        await assertCostCodesExist(lineItems.map((lineItem) => lineItem.costCodeId));

        const lineAmounts = lineItems.map((lineItem) =>
            roundMoney(
                new Prisma.Decimal(lineItem.quantity).times(new Prisma.Decimal(lineItem.unitPrice))
            )
        );
        const totals = calculateCommercialDocumentTotals({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx);

            const po = await tx.purchaseOrder.create({
                data: {
                    id: generateNanoId(),
                    poNumber,
                    projectId: rfq.projectId,
                    vendorId: rfq.awardedVendorId!,
                    rfqId: rfq.id,
                    tradeCategoryId: rfq.typeId,
                    status: 'DRAFT',
                    description: description ?? rfq.description ?? rfq.title,
                    leadTime: leadTime ?? awardedQuote?.leadTime ?? null,
                    shipToAddress: shipToAddress ?? null,
                    address: address ?? null,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal: totals.subtotal,
                    negotiatedDiscount:
                        negotiatedDiscount != null ? totals.negotiatedDiscount : null,
                    shippingHandlingFee:
                        shippingHandlingFee != null ? totals.shippingHandling : null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? totals.taxAmount : null,
                    total: totals.total,
                    retainagePercent: retainagePercent ?? 0,
                    paymentTerms: paymentTerms ?? vendor.paymentTerms,
                    notes: notes ?? null,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((lineItem, i) => ({
                    id: generateNanoId(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: lineItem.description,
                    unitId: lineItem.unitId,
                    quantity: new Prisma.Decimal(lineItem.quantity),
                    unitPrice: new Prisma.Decimal(lineItem.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: lineItem.costCodeId,
                    notes: lineItem.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} from RFQ ${rfq.rfqNumber}`,
                affectedEntityIds: [rfq.id, rfq.projectId, rfq.awardedVendorId!],
                tx,
            });

            return po;
        });
    },

    updatePurchaseOrder: async (
        request: PoUpdateRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const {
            id,
            projectId,
            vendorId,
            rfqId,
            tradeCategoryId,
            expectedDate,
            taxPercent,
            negotiatedDiscount,
            shippingHandlingFee,
            retainagePercent,
            lineItems,
            ...rest
        } = request;

        const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(existing);
        if (existing.status !== 'DRAFT') {
            throw new BadRequestError('PO can only be updated while in DRAFT');
        }
        if (existing.projectId !== projectId) {
            throw new BadRequestError('PO project cannot be changed');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (rfqId) {
            const rfq = await prisma.rFQ.findUnique({
                where: { id: rfqId },
                include: {
                    rfqdeliverables: {
                        select: { id: true, deletedAt: true },
                    },
                },
            });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            assertRfqCanBeLinkedToPurchaseOrder(rfq, projectId);
            assertPurchaseOrderVendorMatchesAwardedRfq(rfq, vendorId);
            assertRfqDeliverableLineItems(rfq, lineItems);
        }

        const tradeCategory = await prisma.lookup.findUnique({ where: { id: tradeCategoryId } });
        if (!tradeCategory) throw new NotFoundError('Trade category not found');

        await assertUnitsExist(lineItems.map((li) => li.unitId));
        await assertCostCodesExist(lineItems.map((li) => li.costCodeId));

        const lineAmounts = lineItems.map((li) =>
            roundMoney(new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice)))
        );
        const totals = calculateCommercialDocumentTotals({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, {
                entityType: 'PURCHASE_ORDER',
                entityId: id,
                userId,
            });

            const updated = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    ...rest,
                    vendorId,
                    rfqId: rfqId ?? null,
                    tradeCategoryId,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal: totals.subtotal,
                    negotiatedDiscount:
                        negotiatedDiscount != null ? totals.negotiatedDiscount : null,
                    shippingHandlingFee:
                        shippingHandlingFee != null ? totals.shippingHandling : null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? totals.taxAmount : null,
                    total: totals.total,
                    retainagePercent: retainagePercent ?? 0,
                },
            });

            await tx.purchaseOrderLineItem.deleteMany({ where: { purchaseOrderId: id } });
            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: generateNanoId(),
                    purchaseOrderId: id,
                    lineNumber: i + 1,
                    description: li.description,
                    unitId: li.unitId,
                    quantity: new Prisma.Decimal(li.quantity),
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId,
                    notes: li.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: id,
                action: 'update',
                description: `Updated PO ${updated.poNumber}`,
                affectedEntityIds: [
                    projectId,
                    vendorId,
                    ...(rfqId ? [rfqId] : []),
                    ...(existing.vendorId !== vendorId ? [existing.vendorId] : []),
                    ...(existing.rfqId && existing.rfqId !== rfqId ? [existing.rfqId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    addAttachment: async (
        request: AddPoAttachmentRequest,
        userId: string
    ): Promise<POAttachment> => {
        const { purchaseOrderId, documentId } = request;

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while PO is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        const existing = await prisma.pOAttachment.findUnique({ where: { documentId } });
        if (existing) throw new ConflictError('File already attached to a PO');

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getOrCreateProjectEntityFolder(
                { projectId: po.projectId, entityType: 'PURCHASE_ORDER', entityId: po.id },
                userId,
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.pOAttachment.create({
                data: { id: generateNanoId(), purchaseOrderId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: purchaseOrderId,
                action: 'link',
                description: `Attached file ${file.name} to PO ${po.poNumber}`,
                affectedEntityIds: [documentId],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (request: RemovePoAttachmentRequest, userId: string): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.pOAttachment.findUnique({
            where: { id },
            include: { purchaseOrder: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        checkDeletedAt(attachment.purchaseOrder);
        if (attachment.purchaseOrder.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while PO is in DRAFT');
        }

        await prisma.pOAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: attachment.purchaseOrderId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from PO ${attachment.purchaseOrder.poNumber}`,
            affectedEntityIds: [attachment.documentId],
        });
    },

    setIssued: async (request: SetPoIssuedRequest, userId: string): Promise<PurchaseOrder> => {
        const { id } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT POs can be issued');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'ISSUED', issuedBy: userId, issuedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Issued PO ${updated.poNumber}`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },

    setDelivered: async (
        request: SetPoDeliveredRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const { id, deliveryDate } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'ISSUED') {
            throw new BadRequestError('Only ISSUED POs can be marked as DELIVERED');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'DELIVERED', deliveryDate: new Date(deliveryDate) },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Marked PO ${updated.poNumber} as DELIVERED`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },

    setCancelled: async (
        request: SetPoCancelledRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const { id, cancellationReason } = request;
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                subChangeOrders: {
                    where: { deletedAt: null, status: { not: 'VOID' } },
                    select: { id: true, scoNumber: true, projectId: true },
                },
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status === 'CANCELLED') {
            throw new BadRequestError('PO is already cancelled');
        }
        if (po.status === 'DELIVERED') {
            throw new BadRequestError('Delivered PO cannot be cancelled');
        }

        const cancelledAt = new Date();
        const voidReason = `Purchase order ${po.poNumber} was cancelled: ${cancellationReason}`;

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancelledBy: userId,
                    cancelledAt,
                    cancellationReason,
                },
            });

            if (po.subChangeOrders.length > 0) {
                await tx.subChangeOrder.updateMany({
                    where: { purchaseOrderId: id, deletedAt: null, status: { not: 'VOID' } },
                    data: {
                        status: 'VOID',
                        voidedBy: userId,
                        voidedAt: cancelledAt,
                        voidReason,
                    },
                });

                for (const sco of po.subChangeOrders) {
                    await ActivityLogService.log({
                        userId,
                        entityType: 'subChangeOrder',
                        entityId: sco.id,
                        action: 'update',
                        description: `Voided SCO ${sco.scoNumber} because PO ${po.poNumber} was cancelled`,
                        affectedEntityIds: [po.projectId, id],
                        tx,
                    });
                }
            }

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: id,
                action: 'update',
                description: `Cancelled PO ${updated.poNumber}`,
                affectedEntityIds: [
                    po.projectId,
                    po.vendorId,
                    ...(po.rfqId ? [po.rfqId] : []),
                    ...po.subChangeOrders.map((sco) => sco.id),
                ],
                tx,
            });

            return updated;
        });
    },
};
