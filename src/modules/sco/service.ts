import { Prisma, SCOAttachment, SubChangeOrder } from '@db/client';
import { AccessContext } from '@lib/access';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { calculateCommercialDocumentTotals, roundMoney } from '@modules/commercial-document/totals';
import { FileService } from '@modules/file/services';
import { PdfNoticeService, type ResolvedPdfNotice } from '@modules/pdf/notice-service';
import { resolvePdfProfile, type PdfProfile } from '@modules/pdf/profile-service';
import { PdfTermsService, type ResolvedPdfTerms } from '@modules/pdf/terms-service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddScoAttachmentRequest,
    GenerateScoPdfRequest,
    RemoveScoAttachmentRequest,
    ScoCreateRequest,
    ScoUpdateRequest,
    SetScoApprovedRequest,
    SetScoRejectedRequest,
    SetScoVoidRequest,
} from './models';
import { generateScoNumber } from './utils';

type SubChangeOrderPdfResult = {
    bytes: Uint8Array;
    fileName: string;
    contentType: string;
    requestHash: string | null;
    cacheHit: boolean;
};

type SavedSubChangeOrderPdfResult = SubChangeOrderPdfResult & {
    savedFileId: string;
    savedAttachmentId: string | null;
};

type SubChangeOrderPdfOrder = Prisma.SubChangeOrderGetPayload<{
    include: {
        project: true;
        purchaseOrder: { include: { vendor: true; tradeCategory: true } };
        changeType: true;
        lineItems: { include: { unit: true } };
    };
}>;

const SUB_CHANGE_ORDER_PDF_TEMPLATE_ID = 'sub_change_order_v1';
const SUB_CHANGE_ORDER_PDF_TERMS_SECTION = 'subChangeOrder';
const SUB_CHANGE_ORDER_PDF_NOTICE_SECTION = 'subChangeOrder';
const FILE_NAME_INVALID_CHARACTERS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
const MAX_SCO_NUMBER_CREATE_ATTEMPTS = 3;
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

function calculateSubChangeOrderTotal({
    lineAmounts,
    negotiatedDiscount,
    shippingHandlingFee,
    taxPercent,
}: {
    lineAmounts: Prisma.Decimal[];
    negotiatedDiscount?: number | null;
    shippingHandlingFee?: number | null;
    taxPercent?: number | null;
}) {
    const totals = calculateCommercialDocumentTotals({
        lineAmounts,
        negotiatedDiscount,
        shippingHandlingFee,
        taxPercent,
    });

    return { ...totals, amount: totals.subtotal };
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

function formatQuantity(value: { toString(): string } | number | null | undefined): string {
    return quantityFormatter.format(toNumber(value));
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
            .trim() || 'sub-change-order.pdf'
    );
}

function formatProjectAddress(project: SubChangeOrderPdfOrder['project']): string {
    return [project.streetAddress, project.city, project.state, project.zipCode]
        .filter(Boolean)
        .join(', ');
}

function getScoReason(sco: SubChangeOrderPdfOrder): { label: string; value: string } {
    if (sco.status === 'REJECTED' && sco.rejectionReason) {
        return { label: 'Rejection Reason', value: sco.rejectionReason };
    }
    if (sco.status === 'VOID' && sco.voidReason) {
        return { label: 'Void Reason', value: sco.voidReason };
    }
    return { label: '', value: '' };
}

function buildSubChangeOrderPdfFileName(sco: SubChangeOrderPdfOrder): string {
    return sanitizeFileName(`${sco.scoNumber || 'sub-change-order'}.pdf`);
}

function formatSavedPdfTimestamp(date = new Date()): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    return [
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${milliseconds}`,
    ].join(' ');
}

function buildSavedSubChangeOrderPdfFileName(fileName: string): string {
    const baseName = fileName.toLowerCase().endsWith('.pdf') ? fileName.slice(0, -4) : fileName;
    return sanitizeFileName(`${baseName} - ${formatSavedPdfTimestamp()}.pdf`);
}

function buildSubChangeOrderPdfData(
    sco: SubChangeOrderPdfOrder,
    requestedBy: string,
    pdfProfile: PdfProfile,
    terms: ResolvedPdfTerms,
    notice: ResolvedPdfNotice,
    costCodeLabels: Map<string, string>
): PdfJsonObject {
    const logoPath = pdfProfile.company.logoPath || 'assets/logo.png';
    const lineAmounts = sco.lineItems.map((item) =>
        new Prisma.Decimal(item.quantity ?? 0).times(new Prisma.Decimal(item.unitPrice ?? 0))
    );
    const totals = calculateCommercialDocumentTotals({
        lineAmounts,
        negotiatedDiscount: toNumber(sco.negotiatedDiscount),
        shippingHandlingFee: toNumber(sco.shippingHandlingFee),
        taxPercent: sco.taxPercent == null ? null : toNumber(sco.taxPercent),
    });
    const reason = getScoReason(sco);

    return {
        company: {
            name: pdfProfile.company.name,
            address_lines: pdfProfile.company.addressLines,
            phone: pdfProfile.company.phone,
            logo_path: logoPath,
        },
        sub_change_order: {
            number: sco.scoNumber,
            title: sco.title,
            description: sco.description || '',
            status: sco.status,
            date: formatDate(sco.date),
            change_type: sco.changeType?.label || '',
            approved_on: formatDate(sco.approvedAt),
            rejected_on: formatDate(sco.rejectedAt),
            voided_on: formatDate(sco.voidedAt),
            reason_label: reason.label,
            reason: reason.value,
        },
        purchase_order: {
            number: sco.purchaseOrder.poNumber || '',
            description: sco.purchaseOrder.description || '',
            status: sco.purchaseOrder.status,
            trade_category: sco.purchaseOrder.tradeCategory?.label || '',
            payment_terms: formatPaymentTerms(sco.purchaseOrder.paymentTerms),
            total: formatCurrencyValue(sco.purchaseOrder.total),
        },
        project: {
            name: sco.project.name,
            number: sco.project.jobNumber || sco.project.contractNumber || '',
            contract_number: sco.project.contractNumber || '',
            address: formatProjectAddress(sco.project),
        },
        vendor: {
            name: sco.purchaseOrder.vendor.name,
            address: sco.purchaseOrder.vendor.address || '',
            email: sco.purchaseOrder.vendor.email || '',
            phone: sco.purchaseOrder.vendor.phone || '',
        },
        request: {
            requested_by: requestedBy,
        },
        line_items: sco.lineItems.map((item, index) => ({
            line_number: String(item.sequenceNumber || index + 1),
            description: item.description || '',
            cost_code: item.costCodeId
                ? costCodeLabels.get(item.costCodeId) || item.costCodeId
                : '',
            quantity: formatQuantity(item.quantity),
            unit: item.unit.label,
            unit_price: formatCurrencyValue(item.unitPrice),
            amount: formatCurrencyValue(item.amount),
        })),
        line_items_count: String(sco.lineItems.length),
        summary: {
            subtotal: formatCurrencyValue(totals.subtotal),
            negotiated_discount: formatCurrencyValue(totals.negotiatedDiscount),
            shipping_and_handling_fee: formatCurrencyValue(totals.shippingHandling),
            tax_label: sco.taxPercent ? `Tax (${formatPercent(sco.taxPercent)})` : 'Tax',
            tax_amount: formatCurrencyValue(totals.taxAmount),
            total: formatCurrencyValue(totals.total),
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
            left: `${pdfProfile.company.name} - ${sco.scoNumber}`,
        },
    };
}

function assertPurchaseOrderCanReceiveSco(
    po: { projectId: string; status: string },
    projectId: string
) {
    if (po.projectId !== projectId) {
        throw new BadRequestError('Purchase order does not belong to this project');
    }
    if (po.status !== 'ISSUED') {
        throw new BadRequestError('Only issued purchase orders can be used for SCOs');
    }
}

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export const ScoService = {
    getScosByPo: async (purchaseOrderId: string) => {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        return await prisma.subChangeOrder.findMany({
            where: { purchaseOrderId, deletedAt: null },
            orderBy: { date: 'desc' },
            include: { changeType: true },
        });
    },

    getSco: async (id: string): Promise<SubChangeOrder> => {
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: {
                project: true,
                purchaseOrder: true,
                changeType: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { sequenceNumber: 'asc' },
                    include: { unit: true },
                },
                attachments: { include: { document: true } },
            },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        return sco;
    },

    getScos: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<{ data: SubChangeOrder[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, purchaseOrderId, status, changeTypeId, ...restFilter } = filter || {};

        const whereClause: Prisma.SubChangeOrderWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(purchaseOrderId && { purchaseOrderId }),
            ...(status && { status }),
            ...(changeTypeId && { changeTypeId }),
            ...(search && {
                OR: [
                    { scoNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const scopedWhereClause: Prisma.SubChangeOrderWhereInput =
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
            prisma.subChangeOrder.count({ where: scopedWhereClause }),
            prisma.subChangeOrder.findMany({
                where: scopedWhereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof SubChangeOrder]: sortOrder },
                include: { project: true, purchaseOrder: true, changeType: true },
            }),
        ]);

        return { data, count };
    },

    generatePdf: async (
        id: string,
        requestedBy: string,
        pdfRequest: GenerateScoPdfRequest
    ): Promise<SubChangeOrderPdfResult> => {
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: {
                project: true,
                purchaseOrder: {
                    include: {
                        vendor: true,
                        tradeCategory: true,
                    },
                },
                changeType: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { sequenceNumber: 'asc' },
                    include: { unit: true },
                },
            },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (!sco.lineItems.length) {
            throw new BadRequestError('SCO must have at least one line item to generate a PDF');
        }

        const costCodeIds = [
            ...new Set(
                sco.lineItems.map((item) => item.costCodeId).filter((id): id is string => !!id)
            ),
        ];
        const costCodes = costCodeIds.length
            ? await prisma.costCode.findMany({ where: { id: { in: costCodeIds } } })
            : [];
        const costCodeLabels = new Map(
            costCodes.map((costCode) => [costCode.id, `${costCode.code} - ${costCode.name}`])
        );

        const fileName = buildSubChangeOrderPdfFileName(sco);
        const [pdfProfile, terms, notice] = await Promise.all([
            resolvePdfProfile(),
            PdfTermsService.resolveForRequest(SUB_CHANGE_ORDER_PDF_TERMS_SECTION, pdfRequest),
            PdfNoticeService.resolveForRequest(SUB_CHANGE_ORDER_PDF_NOTICE_SECTION, pdfRequest),
        ]);
        const pdf = await renderPdf({
            template_id: SUB_CHANGE_ORDER_PDF_TEMPLATE_ID,
            data: buildSubChangeOrderPdfData(
                sco,
                requestedBy,
                pdfProfile,
                terms,
                notice,
                costCodeLabels
            ),
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
        pdfRequest: GenerateScoPdfRequest
    ): Promise<SavedSubChangeOrderPdfResult> => {
        const pdf = await ScoService.generatePdf(id, requestedBy, pdfRequest);
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: { purchaseOrder: { select: { vendorId: true } } },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);

        const folderId = await FileService.getOrCreateProjectEntityFolder(
            { projectId: sco.projectId, entityType: 'SUB_CHANGE_ORDER', entityId: sco.id },
            userId
        );
        const savedFileName = buildSavedSubChangeOrderPdfFileName(pdf.fileName);
        const saved = await FileService.saveGeneratedFile(
            {
                name: savedFileName,
                displayName: savedFileName,
                parentId: folderId,
                mimeType: pdf.contentType,
                content: pdf.bytes,
                afterCreate: async (file, tx) => {
                    const attachment = await tx.sCOAttachment.create({
                        data: { id: generateNanoId(), scoId: sco.id, documentId: file.id },
                    });

                    await ActivityLogService.log({
                        userId,
                        entityType: 'subChangeOrder',
                        entityId: sco.id,
                        action: 'create',
                        description: `Saved generated PDF ${file.name} to SCO ${sco.scoNumber}`,
                        affectedEntityIds: [
                            file.id,
                            sco.projectId,
                            sco.purchaseOrderId,
                            sco.purchaseOrder.vendorId,
                        ],
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

    createSco: async (request: ScoCreateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            projectId,
            purchaseOrderId,
            date,
            changeTypeId,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
            lineItems,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        assertPurchaseOrderCanReceiveSco(po, projectId);

        if (changeTypeId) {
            const changeType = await prisma.lookup.findUnique({ where: { id: changeTypeId } });
            if (!changeType) throw new NotFoundError('Change type not found');
        }

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const lookups = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        const lookupSet = new Set(lookups.map((l) => l.id));
        if (unitIds.some((id) => !lookupSet.has(id))) {
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
            roundMoney(new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice)))
        );
        const totals = calculateSubChangeOrderTotal({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });

        for (let attempt = 1; attempt <= MAX_SCO_NUMBER_CREATE_ATTEMPTS; attempt += 1) {
            try {
                return await prisma.$transaction(async (tx) => {
                    const scoNumber = await generateScoNumber(tx, purchaseOrderId, po.poNumber);

                    const sco = await tx.subChangeOrder.create({
                        data: {
                            ...rest,
                            id: generateNanoId(),
                            scoNumber,
                            projectId,
                            purchaseOrderId,
                            date: new Date(date),
                            status: 'DRAFT',
                            amount: totals.amount,
                            negotiatedDiscount:
                                negotiatedDiscount != null ? totals.negotiatedDiscount : null,
                            shippingHandlingFee:
                                shippingHandlingFee != null ? totals.shippingHandling : null,
                            taxPercent: taxPercent ?? null,
                            taxAmount: taxPercent != null ? totals.taxAmount : null,
                            changeTypeId: changeTypeId ?? null,
                            createdBy: userId,
                        },
                    });

                    await tx.subCOLineItem.createMany({
                        data: lineItems.map((li, i) => ({
                            id: generateNanoId(),
                            subCoId: sco.id,
                            sequenceNumber: i + 1,
                            description: li.description ?? null,
                            quantity: li.quantity,
                            unitId: li.unitId,
                            unitPrice: new Prisma.Decimal(li.unitPrice),
                            amount: lineAmounts[i],
                            costCodeId: li.costCodeId ?? null,
                        })),
                    });

                    await ActivityLogService.log({
                        userId,
                        entityType: 'subChangeOrder',
                        entityId: sco.id,
                        action: 'create',
                        description: `Created SCO ${sco.scoNumber} on project ${project.name}`,
                        affectedEntityIds: [projectId, purchaseOrderId, po.vendorId],
                        tx,
                    });

                    await ActivityLogService.log({
                        userId,
                        entityType: 'purchaseOrder',
                        entityId: purchaseOrderId,
                        action: 'link',
                        description: `Added SCO ${sco.scoNumber} to PO ${po.poNumber ?? purchaseOrderId}`,
                        affectedEntityIds: [projectId, sco.id, po.vendorId],
                        tx,
                    });

                    return sco;
                });
            } catch (error) {
                if (attempt < MAX_SCO_NUMBER_CREATE_ATTEMPTS && isUniqueConstraintError(error)) {
                    continue;
                }
                throw error;
            }
        }

        throw new BadRequestError('Unable to generate SCO number');
    },

    updateSco: async (request: ScoUpdateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            id,
            projectId,
            purchaseOrderId,
            date,
            changeTypeId,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
            lineItems,
            ...rest
        } = request;

        const existing = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(existing);
        if (existing.status !== 'DRAFT') {
            throw new BadRequestError('SCO can only be updated while in DRAFT');
        }
        if (existing.projectId !== projectId) {
            throw new BadRequestError('SCO project cannot be changed');
        }
        if (existing.purchaseOrderId !== purchaseOrderId) {
            throw new BadRequestError('SCO purchase order cannot be changed');
        }

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        assertPurchaseOrderCanReceiveSco(po, projectId);

        if (changeTypeId) {
            const changeType = await prisma.lookup.findUnique({ where: { id: changeTypeId } });
            if (!changeType) throw new NotFoundError('Change type not found');
        }

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const lookups = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        const lookupSet = new Set(lookups.map((l) => l.id));
        if (unitIds.some((uid) => !lookupSet.has(uid))) {
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
            roundMoney(new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice)))
        );
        const totals = calculateSubChangeOrderTotal({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, {
                entityType: 'SUB_CHANGE_ORDER',
                entityId: id,
                userId,
            });

            const updated = await tx.subChangeOrder.update({
                where: { id },
                data: {
                    ...rest,
                    purchaseOrderId,
                    date: new Date(date),
                    amount: totals.amount,
                    negotiatedDiscount:
                        negotiatedDiscount != null ? totals.negotiatedDiscount : null,
                    shippingHandlingFee:
                        shippingHandlingFee != null ? totals.shippingHandling : null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? totals.taxAmount : null,
                    changeTypeId: changeTypeId ?? null,
                },
            });

            await tx.subCOLineItem.deleteMany({ where: { subCoId: id } });
            await tx.subCOLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: generateNanoId(),
                    subCoId: id,
                    sequenceNumber: i + 1,
                    description: li.description ?? null,
                    quantity: li.quantity,
                    unitId: li.unitId,
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'subChangeOrder',
                entityId: id,
                action: 'update',
                description: `Updated SCO ${updated.scoNumber}`,
                affectedEntityIds: [
                    projectId,
                    purchaseOrderId,
                    po.vendorId,
                    ...(existing.purchaseOrderId !== purchaseOrderId
                        ? [existing.purchaseOrderId]
                        : []),
                ],
                tx,
            });

            return updated;
        });
    },

    addAttachment: async (
        request: AddScoAttachmentRequest,
        userId: string
    ): Promise<SCOAttachment> => {
        const { scoId, documentId } = request;

        const sco = await prisma.subChangeOrder.findUnique({
            where: { id: scoId },
            include: { purchaseOrder: { select: { vendorId: true } } },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while SCO is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getOrCreateProjectEntityFolder(
                { projectId: sco.projectId, entityType: 'SUB_CHANGE_ORDER', entityId: sco.id },
                userId,
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.sCOAttachment.create({
                data: { id: generateNanoId(), scoId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'subChangeOrder',
                entityId: scoId,
                action: 'link',
                description: `Attached file ${file.name} to SCO ${sco.scoNumber}`,
                affectedEntityIds: [
                    documentId,
                    sco.projectId,
                    sco.purchaseOrderId,
                    sco.purchaseOrder.vendorId,
                ],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (
        request: RemoveScoAttachmentRequest,
        userId: string
    ): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.sCOAttachment.findUnique({
            where: { id },
            include: {
                sco: { include: { purchaseOrder: { select: { vendorId: true } } } },
                document: true,
            },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        checkDeletedAt(attachment.sco);
        if (attachment.sco.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while SCO is in DRAFT');
        }

        await prisma.sCOAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: attachment.scoId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from SCO ${attachment.sco.scoNumber}`,
            affectedEntityIds: [
                attachment.documentId,
                attachment.sco.projectId,
                attachment.sco.purchaseOrderId,
                attachment.sco.purchaseOrder.vendorId,
            ],
        });
    },

    setApproved: async (
        request: SetScoApprovedRequest,
        userId: string
    ): Promise<SubChangeOrder> => {
        const { id } = request;
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: { purchaseOrder: { select: { vendorId: true } } },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be approved');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Approved SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId, sco.purchaseOrderId, sco.purchaseOrder.vendorId],
        });

        return updated;
    },

    setRejected: async (
        request: SetScoRejectedRequest,
        userId: string
    ): Promise<SubChangeOrder> => {
        const { id, rejectionReason } = request;
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: { purchaseOrder: { select: { vendorId: true } } },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be rejected');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Rejected SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId, sco.purchaseOrderId, sco.purchaseOrder.vendorId],
        });

        return updated;
    },

    setVoid: async (request: SetScoVoidRequest, userId: string): Promise<SubChangeOrder> => {
        const { id, voidReason } = request;
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: { purchaseOrder: { select: { vendorId: true } } },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status === 'VOID') {
            throw new BadRequestError('SCO is already void');
        }
        if (sco.status !== 'APPROVED') {
            throw new BadRequestError('Only APPROVED SCOs can be voided');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: {
                status: 'VOID',
                voidedBy: userId,
                voidedAt: new Date(),
                voidReason,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Voided SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId, sco.purchaseOrderId, sco.purchaseOrder.vendorId],
        });

        return updated;
    },
};
