import { Buffer } from 'node:buffer';

import { Prisma, SCOAttachment, SubChangeOrder } from '@db/client';
import { AccessContext, projectAssignmentWhereForEmployee } from '@lib/access';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import {
    ActivityLogService,
    activityChange,
    activityCollectionChange,
} from '@modules/activity-log';
import {
    calculateCommercialDocumentTotals,
    calculateCommercialLineAmount,
    calculateSubChangeOrderTotal,
    calculateSubChangeOrderTotalAmount,
} from '@modules/commercial-document/totals';
import { FileService } from '@modules/file/services';
import { logFailedMailAttempt, sendLoggedMail, type LoggedMailContext } from '@modules/mail';
import { type MailAttachment, type SendMailInput } from '@modules/mail/mail-service';
import {
    buildDefaultFeatureMailDraft,
    buildFeatureEmailHtml,
    buildSignatureInlineAttachments,
    getFeatureMailTemplate,
    getSignatureAssetMetadata,
    isAllowedFeatureMailSender,
    type TemplateContext,
} from '@modules/mail/template-service';
import { PdfNoticeService, type ResolvedPdfNotice } from '@modules/pdf/notice-service';
import { resolvePdfProfile, type PdfProfile } from '@modules/pdf/profile-service';
import { PdfTermsService, type ResolvedPdfTerms } from '@modules/pdf/terms-service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';
import { Decimal } from 'decimal.js';

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

import type {
    FeatureMailAttachmentPreview,
    FeatureMailDraftBase,
    FeatureMailDraftRequest,
    FeatureMailDraftResponse,
    FeatureMailKey,
    FeatureMailRecipientGroup,
    FeatureMailSendResponse,
    MailSignatureInput,
} from '@modules/mail/models';

async function hydrateScoLineItemCostCodes<
    TSco extends {
        lineItems: Array<{
            costCodeId?: string | null;
        }>;
    },
>(sco: TSco) {
    const costCodeIds = [
        ...new Set(sco.lineItems.map((item) => item.costCodeId).filter((id): id is string => !!id)),
    ];
    const costCodes = costCodeIds.length
        ? await prisma.costCode.findMany({
              where: { id: { in: costCodeIds } },
              select: { id: true, code: true, name: true, description: true },
          })
        : [];
    const costCodeById = new Map(costCodes.map((costCode) => [costCode.id, costCode]));

    return {
        ...sco,
        lineItems: sco.lineItems.map((item) => ({
            ...item,
            costCode: item.costCodeId ? (costCodeById.get(item.costCodeId) ?? null) : null,
        })),
    };
}

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

const subChangeOrderVendorRecipientInclude = {
    contacts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' as const }, { fullName: 'asc' as const }],
        select: {
            id: true,
            fullName: true,
            email: true,
            isPrimary: true,
        },
    },
} satisfies Prisma.VendorInclude;

type SubChangeOrderMailOrder = Prisma.SubChangeOrderGetPayload<{
    include: {
        project: true;
        purchaseOrder: {
            include: {
                vendor: { include: typeof subChangeOrderVendorRecipientInclude };
                tradeCategory: true;
            };
        };
        changeType: true;
        lineItems: {
            where: { deletedAt: null };
            orderBy: { sequenceNumber: 'asc' };
            include: { unit: true };
        };
        attachments: { include: { document: true } };
    };
}>;

const SUB_CHANGE_ORDER_PDF_TEMPLATE_ID = 'sub_change_order_v1';
const SUB_CHANGE_ORDER_PDF_TERMS_SECTION = 'subChangeOrder';
const SUB_CHANGE_ORDER_PDF_NOTICE_SECTION = 'subChangeOrder';
const SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE =
    'subChangeOrder.vendorApproval' satisfies FeatureMailKey;
const SUB_CHANGE_ORDER_PDF_ATTACHMENT_PREFIX = 'generated:sub-change-order-pdf:';
const SUB_CHANGE_ORDER_FILE_ATTACHMENT_PREFIX = 'sub-change-order-file:';
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

function normalizeRecipientEmail(value: string | null | undefined): string | null {
    const email = value?.trim().toLowerCase();
    return email || null;
}

function uniqueEmails(emails: string[]): string[] {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

function getSubChangeOrderPdfAttachmentId(scoId: string): string {
    return `${SUB_CHANGE_ORDER_PDF_ATTACHMENT_PREFIX}${scoId}`;
}

function getSubChangeOrderFileAttachmentId(documentId: string): string {
    return `${SUB_CHANGE_ORDER_FILE_ATTACHMENT_PREFIX}${documentId}`;
}

function buildSubChangeOrderEmailContext(sco: SubChangeOrderMailOrder): TemplateContext {
    const totalAmount = calculateSubChangeOrderTotalAmount(sco);
    return {
        approvedDate: formatDate(sco.approvedAt),
        changeType: sco.changeType?.label || '',
        poNumber: sco.purchaseOrder.poNumber || '',
        projectName: sco.project.name,
        projectNumber: sco.project.jobNumber || sco.project.contractNumber || '',
        scoNumber: sco.scoNumber,
        scoTitle: sco.title,
        total: formatCurrencyValue(totalAmount),
        vendorName: sco.purchaseOrder.vendor.name,
    };
}

function buildSubChangeOrderRecipientGroup(
    sco: SubChangeOrderMailOrder
): FeatureMailRecipientGroup {
    const vendor = sco.purchaseOrder.vendor;
    const vendorEmail = normalizeRecipientEmail(vendor.email);
    const options: FeatureMailRecipientGroup['options'] = [];

    if (vendorEmail) {
        options.push({
            id: `vendor:${sco.purchaseOrder.vendorId}`,
            type: 'vendor',
            label: `${vendor.name} (Vendor)`,
            email: vendorEmail,
        });
    }

    for (const contact of vendor.contacts ?? []) {
        const contactEmail = normalizeRecipientEmail(contact.email);
        if (!contactEmail) continue;

        options.push({
            id: `contact:${contact.id}`,
            type: 'contact',
            label: contact.isPrimary
                ? `${contact.fullName} (Primary Contact)`
                : `${contact.fullName} (Contact)`,
            email: contactEmail,
            isPrimary: contact.isPrimary,
        });
    }

    return {
        id: sco.id,
        label: vendor.name,
        entityType: 'vendor',
        entityId: sco.purchaseOrder.vendorId,
        missingEntityEmail: !vendorEmail,
        options,
    };
}

function getDefaultSubChangeOrderRecipientEmails(sco: SubChangeOrderMailOrder): string[] {
    const group = buildSubChangeOrderRecipientGroup(sco);
    const vendorOption = group.options.find((option) => option.type === 'vendor');
    if (vendorOption) return [vendorOption.email];

    const primaryContactOption = group.options.find(
        (option) => option.type === 'contact' && option.isPrimary
    );
    if (primaryContactOption) return [primaryContactOption.email];

    const firstContactOption = group.options.find((option) => option.type === 'contact');
    return firstContactOption ? [firstContactOption.email] : [];
}

function getSelectedSubChangeOrderRecipients(
    sco: SubChangeOrderMailOrder,
    requestedEmails: string[],
    options: { requireRecipient: boolean }
): string[] {
    const requested = new Set(uniqueEmails(requestedEmails));
    const group = buildSubChangeOrderRecipientGroup(sco);
    const allowed = new Set(group.options.map((option) => option.email));
    const invalidEmails = [...requested].filter((email) => !allowed.has(email));

    if (invalidEmails.length) {
        throw new BadRequestError(
            `One or more selected SCO recipients are not linked to the vendor: ${invalidEmails.join(', ')}`
        );
    }

    const selected = uniqueEmails(
        group.options.map((option) => option.email).filter((email) => requested.has(email))
    );

    if (options.requireRecipient && selected.length === 0) {
        throw new BadRequestError(`Select at least one SCO email recipient for: ${group.label}`);
    }

    return selected;
}

function buildGeneratedSubChangeOrderAttachmentPreview(
    sco: SubChangeOrderMailOrder
): FeatureMailAttachmentPreview {
    return {
        id: getSubChangeOrderPdfAttachmentId(sco.id),
        name: buildSubChangeOrderPdfFileName(sco),
        contentType: 'application/pdf',
        source: 'generated',
    };
}

function buildSubChangeOrderFileAttachmentPreviews(
    sco: SubChangeOrderMailOrder
): FeatureMailAttachmentPreview[] {
    return sco.attachments
        .filter(
            (attachment) => !attachment.document.deletedAt && attachment.document.type === 'FILE'
        )
        .map((attachment) => ({
            id: getSubChangeOrderFileAttachmentId(attachment.documentId),
            name:
                attachment.document.displayName ||
                attachment.document.name ||
                attachment.documentId,
            contentType: attachment.document.mimeType || 'application/octet-stream',
            source: 'subChangeOrder',
        }));
}

function resolveSelectedAttachmentIds(
    request: FeatureMailDraftRequest | null,
    availableAttachments: FeatureMailAttachmentPreview[]
): string[] {
    const availableIds = new Set(availableAttachments.map((attachment) => attachment.id));
    const selectedIds = request
        ? request.attachmentIds
        : availableAttachments.map((attachment) => attachment.id);
    const uniqueSelectedIds = [...new Set(selectedIds)];
    const invalidIds = uniqueSelectedIds.filter((id) => !availableIds.has(id));

    if (invalidIds.length) {
        throw new BadRequestError('One or more selected email attachments are not available');
    }

    return uniqueSelectedIds;
}

function selectAttachmentPreviews(
    attachments: FeatureMailAttachmentPreview[],
    selectedIds: string[]
): FeatureMailAttachmentPreview[] {
    const selected = new Set(selectedIds);
    return attachments.filter((attachment) => selected.has(attachment.id));
}

async function getDefaultSubChangeOrderEmailRequest(
    sco: SubChangeOrderMailOrder,
    signature: MailSignatureInput
): Promise<FeatureMailDraftBase> {
    return buildDefaultFeatureMailDraft({
        feature: SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE,
        context: buildSubChangeOrderEmailContext(sco),
        to: getDefaultSubChangeOrderRecipientEmails(sco),
        signature,
    });
}

async function buildSubChangeOrderEmailDraft(
    sco: SubChangeOrderMailOrder,
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): Promise<FeatureMailDraftResponse> {
    const template = await getFeatureMailTemplate(SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE);
    const availableAttachments = [
        buildGeneratedSubChangeOrderAttachmentPreview(sco),
        ...buildSubChangeOrderFileAttachmentPreviews(sco),
    ];
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const selectedRecipients = request
        ? getSelectedSubChangeOrderRecipients(sco, request.to, {
              requireRecipient: mode === 'send',
          })
        : getDefaultSubChangeOrderRecipientEmails(sco);
    const draft = {
        ...(request ?? (await getDefaultSubChangeOrderEmailRequest(sco, signature))),
        signature,
        to: selectedRecipients,
        attachmentIds,
    };
    const html = buildFeatureEmailHtml(draft.body, draft.signature, template.signature, mode);

    return {
        from: draft.from,
        senderOptions: template.senderOptions,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
        signature: draft.signature,
        attachmentIds: draft.attachmentIds,
        saveToSentItems: draft.saveToSentItems,
        html,
        attachments: selectAttachmentPreviews(availableAttachments, draft.attachmentIds),
        signatureAssets: getSignatureAssetMetadata(template.signature),
        recipientGroups: [buildSubChangeOrderRecipientGroup(sco)],
    };
}

async function getFileMailAttachment(documentId: string): Promise<MailAttachment> {
    const file = await FileService.getFileContent(documentId);

    return {
        name: file.fileName,
        contentType: file.mimeType,
        contentBytes: Buffer.from(file.content).toString('base64'),
    };
}

async function buildSelectedSubChangeOrderMailAttachments({
    sco,
    selectedAttachmentIds,
    requestedBy,
    pdfRequest = {},
}: {
    sco: SubChangeOrderMailOrder;
    selectedAttachmentIds: string[];
    requestedBy: string;
    pdfRequest?: GenerateScoPdfRequest;
}): Promise<MailAttachment[]> {
    const selected = new Set(selectedAttachmentIds);
    const attachments: MailAttachment[] = [];

    if (selected.has(getSubChangeOrderPdfAttachmentId(sco.id))) {
        const pdf = await ScoService.generatePdf(sco.id, requestedBy, pdfRequest);
        attachments.push({
            name: pdf.fileName,
            contentType: pdf.contentType,
            contentBytes: Buffer.from(pdf.bytes).toString('base64'),
        });
    }

    for (const scoAttachment of sco.attachments) {
        if (!selected.has(getSubChangeOrderFileAttachmentId(scoAttachment.documentId))) continue;
        attachments.push(await getFileMailAttachment(scoAttachment.documentId));
    }

    return attachments;
}

function buildSubChangeOrderMailInput(
    draft: FeatureMailDraftResponse,
    attachments: MailAttachment[] = []
): SendMailInput {
    return {
        from: draft.from,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        html: draft.html,
        saveToSentItems: draft.saveToSentItems,
        attachments,
    };
}

function cleanJsonValue(value: unknown): unknown {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        return value.map((item) => cleanJsonValue(item)).filter((item) => item !== undefined);
    }

    return Object.fromEntries(
        Object.entries(value)
            .map(([key, entryValue]) => [key, cleanJsonValue(entryValue)] as const)
            .filter(([, entryValue]) => entryValue !== undefined)
    );
}

function buildSubChangeOrderPdfOptionsMetadata(
    pdfRequest: GenerateScoPdfRequest
): Record<string, unknown> | undefined {
    const cleaned = cleanJsonValue(pdfRequest) as Record<string, unknown>;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function buildSubChangeOrderMailLogContext({
    sco,
    userId,
    pdfRequest,
}: {
    sco: SubChangeOrderMailOrder;
    userId: string;
    pdfRequest?: GenerateScoPdfRequest;
}): LoggedMailContext {
    const pdfOptions = buildSubChangeOrderPdfOptionsMetadata(pdfRequest ?? {});

    return {
        feature: SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE,
        entityType: 'subChangeOrder',
        entityId: sco.id,
        relatedEntityType: 'vendor',
        relatedEntityId: sco.purchaseOrder.vendorId,
        createdBy: userId,
        metadata: {
            poNumber: sco.purchaseOrder.poNumber,
            scoNumber: sco.scoNumber,
            vendorName: sco.purchaseOrder.vendor.name,
            ...(pdfOptions ? { pdfOptions } : {}),
        } as Prisma.InputJsonValue,
        activity: {
            entityType: 'subChangeOrder',
            entityId: sco.id,
            description: `Sent SCO email to ${sco.purchaseOrder.vendor.name} for ${sco.scoNumber}`,
            affectedEntityIds: [sco.purchaseOrder.vendorId, sco.projectId, sco.purchaseOrderId],
        },
    };
}

async function getSubChangeOrderForMail(id: string): Promise<SubChangeOrderMailOrder> {
    const sco = await prisma.subChangeOrder.findUnique({
        where: { id },
        include: {
            project: true,
            purchaseOrder: {
                include: {
                    vendor: { include: subChangeOrderVendorRecipientInclude },
                    tradeCategory: true,
                },
            },
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
    checkDeletedAt(sco.project);
    checkDeletedAt(sco.purchaseOrder);
    checkDeletedAt(sco.purchaseOrder.vendor);

    return sco;
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
        calculateCommercialLineAmount({
            quantity: item.quantity ?? 0,
            unitPrice: item.unitPrice ?? 0,
        })
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
        return (await hydrateScoLineItemCostCodes(sco)) as unknown as SubChangeOrder;
    },

    getVendorEmailDraft: async (
        id: string,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const sco = await getSubChangeOrderForMail(id);
        return buildSubChangeOrderEmailDraft(sco, null, 'preview', signature);
    },

    previewVendorEmail: async (
        id: string,
        request: FeatureMailDraftRequest,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const sco = await getSubChangeOrderForMail(id);
        return buildSubChangeOrderEmailDraft(sco, request, 'preview', signature);
    },

    sendVendorEmail: async (
        id: string,
        request: FeatureMailDraftRequest,
        requestedBy: string,
        userId: string,
        signature: MailSignatureInput,
        pdfRequest: GenerateScoPdfRequest = {}
    ): Promise<FeatureMailSendResponse> => {
        if (
            !(await isAllowedFeatureMailSender(SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE, request.from))
        ) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const sco = await getSubChangeOrderForMail(id);
        if (sco.status !== 'APPROVED') {
            throw new BadRequestError('Only APPROVED SCOs can be emailed');
        }

        const template = await getFeatureMailTemplate(SUB_CHANGE_ORDER_VENDOR_MAIL_FEATURE);
        const draft = await buildSubChangeOrderEmailDraft(sco, request, 'send', signature);
        const mailInput = buildSubChangeOrderMailInput(draft);
        const mailContext = buildSubChangeOrderMailLogContext({ sco, userId, pdfRequest });
        let attachments: MailAttachment[];

        try {
            attachments = [
                ...(await buildSignatureInlineAttachments(template.signature)),
                ...(await buildSelectedSubChangeOrderMailAttachments({
                    sco,
                    selectedAttachmentIds: draft.attachmentIds,
                    requestedBy,
                    pdfRequest,
                })),
            ];
        } catch (error) {
            await logFailedMailAttempt(mailInput, mailContext, error);
            throw error;
        }

        const log = await sendLoggedMail(
            {
                ...mailInput,
                attachments,
            },
            mailContext
        );

        return {
            ...draft,
            sentAt: log.sentAt?.toISOString() ?? new Date().toISOString(),
        };
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
                                        ...projectAssignmentWhereForEmployee(access.employeeId),
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

    getStats: async (projectId: string, access?: AccessContext) => {
        const whereClause: Prisma.SubChangeOrderWhereInput = {
            deletedAt: null,
            projectId,
        };
        const scopedWhereClause: Prisma.SubChangeOrderWhereInput =
            access && access.projectScope !== 'all'
                ? {
                      AND: [
                          whereClause,
                          access.employeeId
                              ? {
                                    project: {
                                        ...projectAssignmentWhereForEmployee(access.employeeId),
                                    },
                                }
                              : { id: { in: [] } },
                      ],
                  }
                : whereClause;

        const [
            totalSubChangeOrders,
            draftSubChangeOrders,
            approvedSubChangeOrders,
            rejectedSubChangeOrders,
            voidSubChangeOrders,
            scos,
        ] = await prisma.$transaction([
            prisma.subChangeOrder.count({ where: scopedWhereClause }),
            prisma.subChangeOrder.count({ where: { ...scopedWhereClause, status: 'DRAFT' } }),
            prisma.subChangeOrder.count({ where: { ...scopedWhereClause, status: 'APPROVED' } }),
            prisma.subChangeOrder.count({ where: { ...scopedWhereClause, status: 'REJECTED' } }),
            prisma.subChangeOrder.count({ where: { ...scopedWhereClause, status: 'VOID' } }),
            prisma.subChangeOrder.findMany({
                where: scopedWhereClause,
                select: {
                    status: true,
                    amount: true,
                    negotiatedDiscount: true,
                    shippingHandlingFee: true,
                    taxPercent: true,
                    taxAmount: true,
                },
            }),
        ]);

        let totalAmount = new Decimal(0);
        let approvedAmount = new Decimal(0);
        let pendingAmount = new Decimal(0);

        for (const sco of scos) {
            const total = calculateSubChangeOrderTotalAmount(sco);
            totalAmount = totalAmount.add(total);
            if (sco.status === 'APPROVED') {
                approvedAmount = approvedAmount.add(total);
            } else if (sco.status === 'DRAFT') {
                pendingAmount = pendingAmount.add(total);
            }
        }

        return {
            totalSubChangeOrders,
            draftSubChangeOrders,
            approvedSubChangeOrders,
            rejectedSubChangeOrders,
            voidSubChangeOrders,
            totalAmount: totalAmount.toNumber(),
            approvedAmount: approvedAmount.toNumber(),
            pendingAmount: pendingAmount.toNumber(),
        };
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

        const lineAmounts = lineItems.map((li) => calculateCommercialLineAmount(li));
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
                            quantity: new Prisma.Decimal(li.quantity),
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
        if (existing.projectId !== projectId) {
            throw new BadRequestError('SCO project cannot be changed');
        }
        if (existing.purchaseOrderId !== purchaseOrderId) {
            throw new BadRequestError('SCO purchase order cannot be changed');
        }

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.projectId !== projectId) {
            throw new BadRequestError('Purchase order does not belong to this project');
        }

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

        const lineAmounts = lineItems.map((li) => calculateCommercialLineAmount(li));
        const totals = calculateSubChangeOrderTotal({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });
        const [currentChangeType, nextChangeType, currentLineItems] = await Promise.all([
            existing.changeTypeId
                ? prisma.lookup.findUnique({
                      where: { id: existing.changeTypeId },
                      select: { label: true },
                  })
                : null,
            changeTypeId
                ? prisma.lookup.findUnique({
                      where: { id: changeTypeId },
                      select: { label: true },
                  })
                : null,
            prisma.subCOLineItem.findMany({
                where: { subCoId: id },
                orderBy: { sequenceNumber: 'asc' },
                select: {
                    sequenceNumber: true,
                    description: true,
                    quantity: true,
                    unitId: true,
                    unitPrice: true,
                    costCodeId: true,
                },
            }),
        ]);
        const activityUnitIds = [
            ...new Set([
                ...currentLineItems.map((item) => item.unitId),
                ...lineItems.map((item) => item.unitId),
            ]),
        ];
        const activityCostCodeIds = [
            ...new Set(
                [
                    ...currentLineItems.map((item) => item.costCodeId),
                    ...lineItems.map((item) => item.costCodeId),
                ].filter((value): value is string => Boolean(value))
            ),
        ];
        const [activityUnits, activityCostCodes] = await Promise.all([
            activityUnitIds.length
                ? prisma.lookup.findMany({
                      where: { id: { in: activityUnitIds } },
                      select: { id: true, label: true },
                  })
                : [],
            activityCostCodeIds.length
                ? prisma.costCode.findMany({
                      where: { id: { in: activityCostCodeIds } },
                      select: { id: true, code: true, name: true },
                  })
                : [],
        ]);
        const unitLabelById = new Map(activityUnits.map((unit) => [unit.id, unit.label]));
        const costCodeLabelById = new Map(
            activityCostCodes.map((costCode) => [
                costCode.id,
                `${costCode.code} - ${costCode.name}`,
            ])
        );
        const normalizeLineItems = (
            items: Array<{
                sequenceNumber?: number | null;
                description?: string | null;
                quantity: { toString(): string } | number;
                unitId: string;
                unitPrice: { toString(): string } | number;
                costCodeId?: string | null;
            }>
        ) =>
            items.map((item, index) => ({
                line: item.sequenceNumber ?? index + 1,
                description: item.description ?? null,
                quantity: item.quantity.toString(),
                unitId: item.unitId,
                unitPrice: item.unitPrice.toString(),
                costCodeId: item.costCodeId ?? null,
            }));
        const formatLookupLabel = (labelsById: Map<string, string>) => (value: unknown) => {
            if (value === undefined || value === null || value === '') return 'none';
            return labelsById.get(String(value)) ?? String(value);
        };

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
                    quantity: new Prisma.Decimal(li.quantity),
                    unitId: li.unitId,
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId ?? null,
                })),
            });

            await ActivityLogService.logFieldUpdate({
                userId,
                entityType: 'subChangeOrder',
                entityId: id,
                subject: { label: 'Sub change order', name: updated.scoNumber },
                changes: [
                    activityChange('Date', existing.date, updated.date, undefined, {
                        section: 'Details',
                        valueType: 'date',
                    }),
                    activityChange('Title', existing.title, updated.title, undefined, {
                        section: 'Details',
                    }),
                    activityChange(
                        'Description',
                        existing.description,
                        updated.description,
                        undefined,
                        {
                            section: 'Details',
                        }
                    ),
                    activityChange(
                        'Change type',
                        currentChangeType?.label,
                        nextChangeType?.label,
                        undefined,
                        {
                            section: 'Details',
                        }
                    ),
                    activityChange(
                        'Negotiated discount',
                        existing.negotiatedDiscount,
                        updated.negotiatedDiscount,
                        undefined,
                        {
                            section: 'Financials',
                            valueType: 'currency',
                        }
                    ),
                    activityChange(
                        'Shipping and handling',
                        existing.shippingHandlingFee,
                        updated.shippingHandlingFee,
                        undefined,
                        {
                            section: 'Financials',
                            valueType: 'currency',
                        }
                    ),
                    activityChange(
                        'Tax percent',
                        existing.taxPercent,
                        updated.taxPercent,
                        undefined,
                        {
                            section: 'Financials',
                            valueType: 'percent',
                        }
                    ),
                    activityChange('Tax amount', existing.taxAmount, updated.taxAmount, undefined, {
                        section: 'Financials',
                        valueType: 'currency',
                    }),
                    activityChange('Amount', existing.amount, updated.amount, undefined, {
                        section: 'Financials',
                        valueType: 'currency',
                    }),
                    activityCollectionChange(
                        'Line items',
                        normalizeLineItems(currentLineItems),
                        normalizeLineItems(lineItems),
                        {
                            section: 'Line items',
                            itemLabel: 'line item',
                            getItemKey: (item) => String(item.line),
                            getItemLabel: (item) =>
                                `Line ${item.line}${item.description ? ` - ${item.description}` : ''}`,
                            fields: [
                                { key: 'description', label: 'Description' },
                                { key: 'quantity', label: 'Quantity', valueType: 'number' },
                                {
                                    key: 'unitId',
                                    label: 'Unit',
                                    formatter: formatLookupLabel(unitLabelById),
                                },
                                {
                                    key: 'unitPrice',
                                    label: 'Unit price',
                                    valueType: 'currency',
                                },
                                {
                                    key: 'costCodeId',
                                    label: 'Cost code',
                                    formatter: formatLookupLabel(costCodeLabelById),
                                },
                            ],
                        }
                    ),
                ],
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
