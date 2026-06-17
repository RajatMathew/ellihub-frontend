import { Buffer } from 'node:buffer';

import { POAttachment, Prisma, PurchaseOrder } from '@db/client';
import { AccessContext, projectAssignmentWhereForEmployee } from '@lib/access';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import {
    ActivityLogService,
    activityChange,
    buildUpdateActivityDescription,
    formatEnumActivityValue,
} from '@modules/activity-log';
import {
    calculateCommercialDocumentTotals,
    calculateCommercialLineAmount,
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
import {
    PdfTermsService,
    type PdfTermsOption,
    type ResolvedPdfTerms,
} from '@modules/pdf/terms-service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';
import { Decimal } from 'decimal.js';

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

const purchaseOrderVendorRecipientInclude = {
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

type PurchaseOrderMailOrder = Prisma.PurchaseOrderGetPayload<{
    include: {
        project: true;
        vendor: { include: typeof purchaseOrderVendorRecipientInclude };
        rfq: {
            include: {
                vendorQuotes: {
                    include: {
                        attachments: { include: { document: true } };
                    };
                };
            };
        };
        tradeCategory: true;
        lineItems: {
            where: { deletedAt: null };
            orderBy: { lineNumber: 'asc' };
            include: { unit: true };
        };
        attachments: { include: { document: true } };
    };
}>;

const PURCHASE_ORDER_PDF_TEMPLATE_ID = 'purchase_order_v1';
const PURCHASE_ORDER_PDF_TERMS_SECTION = 'purchaseOrder';
const PURCHASE_ORDER_PDF_NOTICE_SECTION = 'purchaseOrder';
const PURCHASE_ORDER_VENDOR_MAIL_FEATURE = 'purchaseOrder.vendorIssue' satisfies FeatureMailKey;
const PURCHASE_ORDER_PDF_ATTACHMENT_PREFIX = 'generated:purchase-order-pdf:';
const PURCHASE_ORDER_FILE_ATTACHMENT_PREFIX = 'purchase-order-file:';
const PURCHASE_ORDER_RFQ_QUOTE_ATTACHMENT_PREFIX = 'rfq-quote-file:';
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
        calculateCommercialLineAmount({
            quantity: item.quantity ?? 0,
            unitPrice: item.unitPrice ?? 0,
        })
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

function normalizeRecipientEmail(value: string | null | undefined): string | null {
    const email = value?.trim().toLowerCase();
    return email || null;
}

function uniqueEmails(emails: string[]): string[] {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

function getPurchaseOrderPdfAttachmentId(poId: string): string {
    return `${PURCHASE_ORDER_PDF_ATTACHMENT_PREFIX}${poId}`;
}

function getPurchaseOrderFileAttachmentId(documentId: string): string {
    return `${PURCHASE_ORDER_FILE_ATTACHMENT_PREFIX}${documentId}`;
}

function getPurchaseOrderRfqQuoteAttachmentId(documentId: string): string {
    return `${PURCHASE_ORDER_RFQ_QUOTE_ATTACHMENT_PREFIX}${documentId}`;
}

function buildPurchaseOrderEmailContext(po: PurchaseOrderMailOrder): TemplateContext {
    return {
        expectedDate: formatDate(po.expectedDate),
        issuedDate: formatDate(po.issuedAt),
        poDescription: po.description || '',
        poNumber: po.poNumber,
        projectName: po.project.name,
        projectNumber: po.project.jobNumber || po.project.contractNumber || '',
        total: formatCurrencyValue(po.total),
        tradeCategory: po.tradeCategory.label,
        vendorName: po.vendor.name,
    };
}

function buildPurchaseOrderRecipientGroup(po: PurchaseOrderMailOrder): FeatureMailRecipientGroup {
    const vendorEmail = normalizeRecipientEmail(po.vendor.email);
    const options: FeatureMailRecipientGroup['options'] = [];

    if (vendorEmail) {
        options.push({
            id: `vendor:${po.vendorId}`,
            type: 'vendor',
            label: `${po.vendor.name} (Vendor)`,
            email: vendorEmail,
        });
    }

    for (const contact of po.vendor.contacts ?? []) {
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
        id: po.id,
        label: po.vendor.name,
        entityType: 'vendor',
        entityId: po.vendorId,
        missingEntityEmail: !vendorEmail,
        options,
    };
}

function getDefaultPurchaseOrderRecipientEmails(po: PurchaseOrderMailOrder): string[] {
    const group = buildPurchaseOrderRecipientGroup(po);
    const vendorOption = group.options.find((option) => option.type === 'vendor');
    if (vendorOption) return [vendorOption.email];

    const primaryContactOption = group.options.find(
        (option) => option.type === 'contact' && option.isPrimary
    );
    if (primaryContactOption) return [primaryContactOption.email];

    const firstContactOption = group.options.find((option) => option.type === 'contact');
    return firstContactOption ? [firstContactOption.email] : [];
}

function getSelectedPurchaseOrderRecipients(
    po: PurchaseOrderMailOrder,
    requestedEmails: string[],
    options: { requireRecipient: boolean }
): string[] {
    const requested = new Set(uniqueEmails(requestedEmails));
    const group = buildPurchaseOrderRecipientGroup(po);
    const allowed = new Set(group.options.map((option) => option.email));
    const invalidEmails = [...requested].filter((email) => !allowed.has(email));

    if (invalidEmails.length) {
        throw new BadRequestError(
            `One or more selected PO recipients are not linked to the vendor: ${invalidEmails.join(', ')}`
        );
    }

    const selected = uniqueEmails(
        group.options.map((option) => option.email).filter((email) => requested.has(email))
    );

    if (options.requireRecipient && selected.length === 0) {
        throw new BadRequestError(`Select at least one PO email recipient for: ${group.label}`);
    }

    return selected;
}

function buildGeneratedPurchaseOrderAttachmentPreview(
    po: PurchaseOrderMailOrder
): FeatureMailAttachmentPreview {
    return {
        id: getPurchaseOrderPdfAttachmentId(po.id),
        name: buildPurchaseOrderPdfFileName(po),
        contentType: 'application/pdf',
        source: 'generated',
    };
}

function buildPurchaseOrderFileAttachmentPreviews(
    po: PurchaseOrderMailOrder
): FeatureMailAttachmentPreview[] {
    return po.attachments
        .filter(
            (attachment) => !attachment.document.deletedAt && attachment.document.type === 'FILE'
        )
        .map((attachment) => ({
            id: getPurchaseOrderFileAttachmentId(attachment.documentId),
            name:
                attachment.document.displayName ||
                attachment.document.name ||
                attachment.documentId,
            contentType: attachment.document.mimeType || 'application/octet-stream',
            source: 'purchaseOrder',
        }));
}

function getLinkedRfqAwardedQuote(po: PurchaseOrderMailOrder) {
    return po.rfq?.vendorQuotes.find((quote) => quote.vendorId === po.vendorId) ?? null;
}

function buildPurchaseOrderRfqQuoteAttachmentPreviews(
    po: PurchaseOrderMailOrder
): FeatureMailAttachmentPreview[] {
    const quote = getLinkedRfqAwardedQuote(po);
    if (!quote) return [];

    return quote.attachments
        .filter(
            (attachment) => !attachment.document.deletedAt && attachment.document.type === 'FILE'
        )
        .map((attachment) => ({
            id: getPurchaseOrderRfqQuoteAttachmentId(attachment.documentId),
            name: `RFQ Quotation - ${
                attachment.document.displayName || attachment.document.name || attachment.documentId
            }`,
            contentType: attachment.document.mimeType || 'application/octet-stream',
            source: 'rfqQuote',
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

async function getDefaultPurchaseOrderEmailRequest(
    po: PurchaseOrderMailOrder,
    signature: MailSignatureInput
): Promise<FeatureMailDraftBase> {
    return buildDefaultFeatureMailDraft({
        feature: PURCHASE_ORDER_VENDOR_MAIL_FEATURE,
        context: buildPurchaseOrderEmailContext(po),
        to: getDefaultPurchaseOrderRecipientEmails(po),
        signature,
    });
}

async function buildPurchaseOrderEmailDraft(
    po: PurchaseOrderMailOrder,
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): Promise<FeatureMailDraftResponse> {
    const template = await getFeatureMailTemplate(PURCHASE_ORDER_VENDOR_MAIL_FEATURE);
    const availableAttachments = [
        buildGeneratedPurchaseOrderAttachmentPreview(po),
        ...buildPurchaseOrderFileAttachmentPreviews(po),
        ...buildPurchaseOrderRfqQuoteAttachmentPreviews(po),
    ];
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const selectedRecipients = request
        ? getSelectedPurchaseOrderRecipients(po, request.to, { requireRecipient: mode === 'send' })
        : getDefaultPurchaseOrderRecipientEmails(po);
    const draft = {
        ...(request ?? (await getDefaultPurchaseOrderEmailRequest(po, signature))),
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
        recipientGroups: [buildPurchaseOrderRecipientGroup(po)],
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

async function buildSelectedPurchaseOrderMailAttachments({
    po,
    selectedAttachmentIds,
    requestedBy,
    pdfRequest = {},
}: {
    po: PurchaseOrderMailOrder;
    selectedAttachmentIds: string[];
    requestedBy: string;
    pdfRequest?: GeneratePoPdfRequest;
}): Promise<MailAttachment[]> {
    const selected = new Set(selectedAttachmentIds);
    const attachments: MailAttachment[] = [];

    if (selected.has(getPurchaseOrderPdfAttachmentId(po.id))) {
        const pdf = await PoService.generatePdf(po.id, requestedBy, pdfRequest);
        attachments.push({
            name: pdf.fileName,
            contentType: pdf.contentType,
            contentBytes: Buffer.from(pdf.bytes).toString('base64'),
        });
    }

    for (const poAttachment of po.attachments) {
        if (!selected.has(getPurchaseOrderFileAttachmentId(poAttachment.documentId))) continue;
        attachments.push(await getFileMailAttachment(poAttachment.documentId));
    }

    const linkedQuote = getLinkedRfqAwardedQuote(po);
    for (const quoteAttachment of linkedQuote?.attachments ?? []) {
        if (!selected.has(getPurchaseOrderRfqQuoteAttachmentId(quoteAttachment.documentId))) {
            continue;
        }
        attachments.push(await getFileMailAttachment(quoteAttachment.documentId));
    }

    return attachments;
}

function buildPurchaseOrderMailInput(
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

function buildPurchaseOrderPdfOptionsMetadata(
    pdfRequest: GeneratePoPdfRequest
): Record<string, unknown> | undefined {
    const cleaned = cleanJsonValue(pdfRequest) as Record<string, unknown>;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function buildPurchaseOrderMailLogContext({
    po,
    userId,
    pdfRequest,
}: {
    po: PurchaseOrderMailOrder;
    userId: string;
    pdfRequest?: GeneratePoPdfRequest;
}): LoggedMailContext {
    const pdfOptions = buildPurchaseOrderPdfOptionsMetadata(pdfRequest ?? {});

    return {
        feature: PURCHASE_ORDER_VENDOR_MAIL_FEATURE,
        entityType: 'purchaseOrder',
        entityId: po.id,
        relatedEntityType: 'vendor',
        relatedEntityId: po.vendorId,
        createdBy: userId,
        metadata: {
            poNumber: po.poNumber,
            vendorName: po.vendor.name,
            ...(pdfOptions ? { pdfOptions } : {}),
        } as Prisma.InputJsonValue,
        activity: {
            entityType: 'purchaseOrder',
            entityId: po.id,
            description: `Sent PO email to ${po.vendor.name} for ${po.poNumber}`,
            affectedEntityIds: [po.vendorId, po.projectId, ...(po.rfqId ? [po.rfqId] : [])],
        },
    };
}

async function getPurchaseOrderForMail(id: string): Promise<PurchaseOrderMailOrder> {
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
            project: true,
            vendor: { include: purchaseOrderVendorRecipientInclude },
            rfq: {
                include: {
                    vendorQuotes: {
                        where: { isAwarded: true },
                        include: {
                            attachments: { include: { document: true } },
                        },
                    },
                },
            },
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
    checkDeletedAt(po.project);
    checkDeletedAt(po.vendor);

    return po;
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

async function hydratePurchaseOrderLineItemCostCodes<
    TPurchaseOrder extends {
        lineItems: Array<{
            costCodeId?: string | null;
        }>;
    },
>(po: TPurchaseOrder) {
    const costCodeIds = [
        ...new Set(po.lineItems.map((item) => item.costCodeId).filter((id): id is string => !!id)),
    ];
    const costCodes = costCodeIds.length
        ? await prisma.costCode.findMany({
              where: { id: { in: costCodeIds } },
              select: { id: true, code: true, name: true, description: true },
          })
        : [];
    const costCodeById = new Map(costCodes.map((costCode) => [costCode.id, costCode]));

    return {
        ...po,
        lineItems: po.lineItems.map((item) => ({
            ...item,
            costCode: item.costCodeId ? (costCodeById.get(item.costCodeId) ?? null) : null,
        })),
    };
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
                poPayments: {
                    orderBy: { txnDate: 'desc' },
                },
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        return (await hydratePurchaseOrderLineItemCostCodes(po)) as unknown as PurchaseOrder;
    },

    getDefaultPdfTerms: async (): Promise<{ html: string }> => {
        return PdfTermsService.getDefaultTerms(PURCHASE_ORDER_PDF_TERMS_SECTION);
    },

    getPdfTermsOptions: async (): Promise<PdfTermsOption[]> => {
        return (await PdfTermsService.getConfig(PURCHASE_ORDER_PDF_TERMS_SECTION)).options;
    },

    getVendorEmailDraft: async (
        id: string,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const po = await getPurchaseOrderForMail(id);
        return buildPurchaseOrderEmailDraft(po, null, 'preview', signature);
    },

    previewVendorEmail: async (
        id: string,
        request: FeatureMailDraftRequest,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const po = await getPurchaseOrderForMail(id);
        return buildPurchaseOrderEmailDraft(po, request, 'preview', signature);
    },

    sendVendorEmail: async (
        id: string,
        request: FeatureMailDraftRequest,
        requestedBy: string,
        userId: string,
        signature: MailSignatureInput,
        pdfRequest: GeneratePoPdfRequest = {}
    ): Promise<FeatureMailSendResponse> => {
        if (!(await isAllowedFeatureMailSender(PURCHASE_ORDER_VENDOR_MAIL_FEATURE, request.from))) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const po = await getPurchaseOrderForMail(id);
        if (po.status !== 'ISSUED' && po.status !== 'DELIVERED') {
            throw new BadRequestError('Only ISSUED or DELIVERED POs can be emailed');
        }

        const template = await getFeatureMailTemplate(PURCHASE_ORDER_VENDOR_MAIL_FEATURE);
        const draft = await buildPurchaseOrderEmailDraft(po, request, 'send', signature);
        const mailInput = buildPurchaseOrderMailInput(draft);
        const mailContext = buildPurchaseOrderMailLogContext({ po, userId, pdfRequest });
        let attachments: MailAttachment[];

        try {
            attachments = [
                ...(await buildSignatureInlineAttachments(template.signature)),
                ...(await buildSelectedPurchaseOrderMailAttachments({
                    po,
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
                                        ...projectAssignmentWhereForEmployee(access.employeeId),
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
                            taxPercent: true,
                            taxAmount: true,
                            status: true,
                        },
                    },
                },
            }),
        ]);

        return { data, count };
    },

    getStats: async (projectId: string, access?: AccessContext) => {
        const whereClause: Prisma.PurchaseOrderWhereInput = {
            deletedAt: null,
            projectId,
        };
        const scopedWhereClause: Prisma.PurchaseOrderWhereInput =
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
            totalPurchaseOrders,
            draftPurchaseOrders,
            issuedPurchaseOrders,
            deliveredPurchaseOrders,
            cancelledPurchaseOrders,
            committedPOs,
        ] = await prisma.$transaction([
            prisma.purchaseOrder.count({ where: scopedWhereClause }),
            prisma.purchaseOrder.count({ where: { ...scopedWhereClause, status: 'DRAFT' } }),
            prisma.purchaseOrder.count({ where: { ...scopedWhereClause, status: 'ISSUED' } }),
            prisma.purchaseOrder.count({ where: { ...scopedWhereClause, status: 'DELIVERED' } }),
            prisma.purchaseOrder.count({ where: { ...scopedWhereClause, status: 'CANCELLED' } }),
            prisma.purchaseOrder.findMany({
                where: {
                    ...scopedWhereClause,
                    status: { in: ['ISSUED', 'DELIVERED'] },
                },
                select: {
                    total: true,
                    subChangeOrders: {
                        where: { status: 'APPROVED', deletedAt: null },
                        select: {
                            amount: true,
                            negotiatedDiscount: true,
                            shippingHandlingFee: true,
                            taxPercent: true,
                            taxAmount: true,
                        },
                    },
                },
            }),
        ]);

        let totalCommitted = new Decimal(0);
        for (const po of committedPOs) {
            const poTotal = new Decimal(po.total);
            const scosSum = po.subChangeOrders.reduce<Decimal>(
                (sum, sco) => sum.add(calculateSubChangeOrderTotalAmount(sco)),
                new Decimal(0)
            );
            totalCommitted = totalCommitted.add(poTotal).add(scosSum);
        }

        return {
            totalPurchaseOrders,
            draftPurchaseOrders,
            issuedPurchaseOrders,
            deliveredPurchaseOrders,
            cancelledPurchaseOrders,
            totalCommitted: totalCommitted.toNumber(),
        };
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

        const lineAmounts = lineItems.map((li) => calculateCommercialLineAmount(li));
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

        const lineAmounts = lineItems.map((lineItem) => calculateCommercialLineAmount(lineItem));
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

        const lineAmounts = lineItems.map((li) => calculateCommercialLineAmount(li));
        const totals = calculateCommercialDocumentTotals({
            lineAmounts,
            negotiatedDiscount,
            shippingHandlingFee,
            taxPercent,
        });
        const [currentVendor, currentRfq, nextRfq, currentTradeCategory, currentLineItems] =
            await Promise.all([
                prisma.vendor.findUnique({
                    where: { id: existing.vendorId },
                    select: { name: true },
                }),
                existing.rfqId
                    ? prisma.rFQ.findUnique({
                          where: { id: existing.rfqId },
                          select: { rfqNumber: true },
                      })
                    : null,
                rfqId
                    ? prisma.rFQ.findUnique({
                          where: { id: rfqId },
                          select: { rfqNumber: true },
                      })
                    : null,
                prisma.lookup.findUnique({
                    where: { id: existing.tradeCategoryId },
                    select: { label: true },
                }),
                prisma.purchaseOrderLineItem.findMany({
                    where: { purchaseOrderId: id, deletedAt: null },
                    orderBy: { lineNumber: 'asc' },
                    select: {
                        description: true,
                        unitId: true,
                        quantity: true,
                        unitPrice: true,
                        costCodeId: true,
                        notes: true,
                    },
                }),
            ]);
        const normalizeLineItems = (
            items: Array<{
                description: string;
                unitId: string;
                quantity?: { toString(): string } | number | null;
                unitPrice?: { toString(): string } | number | null;
                costCodeId?: string | null;
                notes?: string | null;
            }>
        ) =>
            items.map((item) => ({
                description: item.description,
                unitId: item.unitId,
                quantity: item.quantity?.toString() ?? null,
                unitPrice: item.unitPrice?.toString() ?? null,
                costCodeId: item.costCodeId ?? null,
                notes: item.notes ?? null,
            }));
        const formatLineItems = (value: unknown) =>
            Array.isArray(value)
                ? value
                      .map((item) => {
                          const lineItem = item as { description?: string; quantity?: string };
                          return `${lineItem.description ?? 'Line item'} (${lineItem.quantity ?? '?'})`;
                      })
                      .join(', ') || 'none'
                : String(value ?? 'none');

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
                description: buildUpdateActivityDescription(`PO ${updated.poNumber}`, [
                    activityChange('Vendor', currentVendor?.name, vendor.name),
                    activityChange('RFQ', currentRfq?.rfqNumber, nextRfq?.rfqNumber),
                    activityChange(
                        'Trade category',
                        currentTradeCategory?.label,
                        tradeCategory.label
                    ),
                    activityChange('Description', existing.description, updated.description),
                    activityChange('Lead time', existing.leadTime, updated.leadTime),
                    activityChange(
                        'Ship to address',
                        existing.shipToAddress,
                        updated.shipToAddress
                    ),
                    activityChange('Address', existing.address, updated.address),
                    activityChange('Expected date', existing.expectedDate, updated.expectedDate),
                    activityChange(
                        'Payment terms',
                        existing.paymentTerms,
                        updated.paymentTerms,
                        formatEnumActivityValue
                    ),
                    activityChange('Notes', existing.notes, updated.notes),
                    activityChange('Subtotal', existing.subtotal, updated.subtotal),
                    activityChange(
                        'Negotiated discount',
                        existing.negotiatedDiscount,
                        updated.negotiatedDiscount
                    ),
                    activityChange(
                        'Shipping and handling',
                        existing.shippingHandlingFee,
                        updated.shippingHandlingFee
                    ),
                    activityChange('Tax percent', existing.taxPercent, updated.taxPercent),
                    activityChange('Tax amount', existing.taxAmount, updated.taxAmount),
                    activityChange(
                        'Retainage percent',
                        existing.retainagePercent,
                        updated.retainagePercent
                    ),
                    activityChange('Total', existing.total, updated.total),
                    activityChange(
                        'Line items',
                        normalizeLineItems(currentLineItems),
                        normalizeLineItems(lineItems),
                        formatLineItems
                    ),
                ]),
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
        if (po.status === 'CANCELLED') {
            throw new BadRequestError('Attachments cannot be added to a cancelled PO');
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
