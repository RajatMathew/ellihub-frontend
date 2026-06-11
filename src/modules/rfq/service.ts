import { Buffer } from 'node:buffer';

import { RFQ, RFQAttachment, RFQVendorQuote, type Prisma } from '@db/client';
import { AccessContext } from '@lib/access';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware/pagination';
import { ActivityLogService } from '@modules/activity-log';
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
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddRfqAttachmentRequest,
    AddVendorRequest,
    AwardRfqRequest,
    DeclineQuoteRequest,
    EditQuoteRequest,
    RemoveQuoteRequest,
    RemoveRfqAttachmentRequest,
    RemoveVendorRequest,
    RfqCreateRequest,
    RfqUpdateRequest,
    SubmitQuoteRequest,
    UnawardRfqRequest,
    VoidAwardRequest,
    VoidRfqRequest,
    type GenerateVendorPdfRequest,
} from './models';

import type {
    FeatureMailDraftBase,
    FeatureMailDraftRequest,
    FeatureMailDraftResponse,
    FeatureMailKey,
    FeatureMailRecipientGroup,
    FeatureMailSendResponse,
    MailSignatureInput,
} from '@modules/mail/models';

type RfqVendorPdfResult = {
    bytes: Uint8Array;
    fileName: string;
    contentType: string;
    requestHash: string | null;
    cacheHit: boolean;
};

type SavedRfqVendorPdfResult = RfqVendorPdfResult & {
    savedFileId: string;
    savedAttachmentId: string | null;
};

const rfqVendorRecipientInclude = {
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

type RfqVendorPdfQuote = Prisma.RFQVendorQuoteGetPayload<{
    include: {
        vendor: { include: typeof rfqVendorRecipientInclude };
        rfq: {
            include: {
                project: true;
                type: true;
                rfqdeliverables: { include: { unit: true } };
                rfqattachments: { include: { document: true } };
            };
        };
    };
}>;

type RfqListItem = Prisma.RFQGetPayload<{
    include: {
        project: true;
        type: true;
        awardedVendor: true;
    };
}> & {
    _count: {
        invites: number;
        quotes: number;
    };
};

type RfqBidComparison = {
    rfq: {
        rfqNumber: string;
        title: string;
        estimatedBudget: number | null;
        bidDeadline: Date;
        status: { id: string; name: string; label: string };
    };
    deliverables: Array<{
        id: string;
        sequenceNumber: number | null;
        description: string;
        quantity: number;
        unit: string;
        estimatedUnitPrice: number | null;
        estimatedTotal: number | null;
    }>;
    quotes: Array<{
        quoteId: string;
        vendorId: string;
        vendorName: string;
        status: { id: string; name: string; label: string };
        totalAmount: number;
        taxAmount: number | null;
        grandTotal: number;
        leadTimeDays: number | null;
        warrantyPeriod: string | null;
        isResponsive: boolean | null;
        attachments: Array<{
            id: string;
            documentId: string;
            document: { id: string; name: string; mimeType?: string };
        }>;
        lineItems: Array<{
            deliverableId: string;
            sequenceNumber: number | null;
            unitPrice: number;
            quantity: number;
            lineTotal: number;
            notes: string | null;
            alternateProposed: boolean;
        }>;
    }>;
    statistics: {
        lowestQuote: number | null;
        highestQuote: number | null;
        averageQuote: number | null;
        medianQuote: number | null;
        quotesSubmitted: number;
        quotesExpected: number;
        budgetVariance: number | null;
    };
};

const RFQ_VENDOR_PDF_TEMPLATE_ID = 'rfq_vendor_request_v1';
const RFQ_VENDOR_MAIL_FEATURE = 'rfq.vendorRequest' satisfies FeatureMailKey;
const RFQ_VENDOR_BULK_MAIL_FEATURE = 'rfq.vendorRequestAll' satisfies FeatureMailKey;
const RFQ_VENDOR_PDF_ATTACHMENT_PREFIX = 'generated:rfq-vendor-pdf:';
const RFQ_FILE_ATTACHMENT_PREFIX = 'file:rfq:';
const FILE_NAME_INVALID_CHARACTERS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
});

const quantityFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    return dateFormatter.format(new Date(value));
}

function formatQuantity(value: { toString(): string }): string {
    const numericValue = Number(value.toString());
    if (!Number.isFinite(numericValue)) return value.toString();
    return quantityFormatter.format(numericValue);
}

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
    if (value == null) return null;
    const numericValue = typeof value === 'number' ? value : Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : null;
}

function parseLeadTimeDays(value: string | null | undefined): number | null {
    if (!value) return null;
    const match = value.match(/\d+/);
    if (!match) return null;
    const numericValue = Number(match[0]);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function getMedian(values: number[]): number | null {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle] ?? null;

    const lower = sorted[middle - 1];
    const upper = sorted[middle];
    if (lower == null || upper == null) return null;
    return (lower + upper) / 2;
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
            .trim() || 'rfq.pdf'
    );
}

function buildRfqVendorPdfData(
    quote: RfqVendorPdfQuote,
    requestedBy: string,
    pdfProfile: PdfProfile,
    terms: ResolvedPdfTerms,
    notice: ResolvedPdfNotice
): PdfJsonObject {
    const shipToName = pdfProfile.shipToName || pdfProfile.company.name;
    const logoPath = pdfProfile.company.logoPath || 'assets/logo.png';
    return {
        company: {
            name: pdfProfile.company.name,
            address_lines: pdfProfile.company.addressLines,
            phone: pdfProfile.company.phone,
            logo_path: logoPath,
        },
        rfq: {
            number: quote.rfq.rfqNumber,
            title: quote.rfq.title,
            description: quote.rfq.description || '',
            issued_on: formatDate(new Date()),
            needed_by: formatDate(quote.rfq.bidDeadline),
            type: quote.rfq.type.label,
            status: quote.rfq.status,
        },
        project: {
            name: quote.rfq.project.name,
            number: quote.rfq.project.jobNumber || quote.rfq.project.contractNumber || '',
            contract_number: quote.rfq.project.contractNumber || '',
        },
        vendor: {
            name: quote.vendor.name,
            address: quote.vendor.address || '',
            email: quote.vendor.email || '',
            phone: quote.vendor.phone || '',
        },
        request: {
            ship_to: shipToName,
            requested_by: requestedBy,
        },
        deliverables: quote.rfq.rfqdeliverables.map((deliverable, index) => ({
            sequence: String(index + 1),
            description: deliverable.name,
            quantity: formatQuantity(deliverable.quantity),
            unit: deliverable.unit.label,
        })),
        deliverables_count: String(quote.rfq.rfqdeliverables.length),
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
            left: `${pdfProfile.company.name} - ${quote.rfq.rfqNumber}`,
        },
    };
}

function buildRfqVendorPdfFileName(quote: RfqVendorPdfQuote): string {
    return sanitizeFileName(`${quote.rfq.rfqNumber}-${quote.vendor.name}-request-for-quote.pdf`);
}

function formatSavedPdfTimestamp(date = new Date()): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    return [
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${milliseconds}`,
    ].join(' ');
}

function buildSavedRfqVendorPdfFileName(fileName: string): string {
    const baseName = fileName.toLowerCase().endsWith('.pdf') ? fileName.slice(0, -4) : fileName;
    return sanitizeFileName(`${baseName} - ${formatSavedPdfTimestamp()}.pdf`);
}

function buildRfqVendorEmailContext(quote: RfqVendorPdfQuote): TemplateContext {
    return {
        bidDeadline: formatDate(quote.rfq.bidDeadline),
        projectName: quote.rfq.project.name,
        projectNumber: quote.rfq.project.jobNumber || quote.rfq.project.contractNumber || '',
        rfqNumber: quote.rfq.rfqNumber,
        rfqTitle: quote.rfq.title,
        vendorName: quote.vendor.name,
    };
}

function normalizeRecipientEmail(value: string | null | undefined): string | null {
    const email = value?.trim().toLowerCase();
    return email || null;
}

function uniqueEmails(emails: string[]): string[] {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

function buildRfqVendorRecipientGroup(quote: RfqVendorPdfQuote): FeatureMailRecipientGroup {
    const vendorEmail = normalizeRecipientEmail(quote.vendor.email);
    const options: FeatureMailRecipientGroup['options'] = [];

    if (vendorEmail) {
        options.push({
            id: `vendor:${quote.vendorId}`,
            type: 'vendor',
            label: `${quote.vendor.name} (Vendor)`,
            email: vendorEmail,
        });
    }

    for (const contact of quote.vendor.contacts ?? []) {
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
        id: quote.id,
        label: quote.vendor.name,
        entityType: 'vendor',
        entityId: quote.vendorId,
        quoteId: quote.id,
        missingEntityEmail: !vendorEmail,
        options,
    };
}

function buildRfqVendorRecipientGroups(quotes: RfqVendorPdfQuote[]): FeatureMailRecipientGroup[] {
    return quotes.map(buildRfqVendorRecipientGroup);
}

function getDefaultRfqVendorRecipientEmails(quote: RfqVendorPdfQuote): string[] {
    const group = buildRfqVendorRecipientGroup(quote);
    const vendorOption = group.options.find((option) => option.type === 'vendor');
    if (vendorOption) return [vendorOption.email];

    const primaryContactOption = group.options.find(
        (option) => option.type === 'contact' && option.isPrimary
    );
    if (primaryContactOption) return [primaryContactOption.email];

    const firstContactOption = group.options.find((option) => option.type === 'contact');
    return firstContactOption ? [firstContactOption.email] : [];
}

function getDefaultRfqRecipientEmails(quotes: RfqVendorPdfQuote[]): string[] {
    return uniqueEmails(quotes.flatMap(getDefaultRfqVendorRecipientEmails));
}

function getSelectedRfqRecipientsByQuote(
    quotes: RfqVendorPdfQuote[],
    requestedEmails: string[],
    options: { requireEveryVendor: boolean }
): Map<string, string[]> {
    const requested = new Set(uniqueEmails(requestedEmails));
    const groups = buildRfqVendorRecipientGroups(quotes);
    const allowed = new Set(groups.flatMap((group) => group.options.map((option) => option.email)));
    const invalidEmails = [...requested].filter((email) => !allowed.has(email));

    if (invalidEmails.length) {
        throw new BadRequestError(
            `One or more selected RFQ recipients are not linked to the invited vendor: ${invalidEmails.join(', ')}`
        );
    }

    const recipientsByQuote = new Map<string, string[]>();
    const missingVendors: string[] = [];

    for (const group of groups) {
        const selected = uniqueEmails(
            group.options.map((option) => option.email).filter((email) => requested.has(email))
        );

        recipientsByQuote.set(group.id, selected);
        if (options.requireEveryVendor && selected.length === 0) {
            missingVendors.push(group.label);
        }
    }

    if (missingVendors.length) {
        throw new BadRequestError(
            `Select at least one RFQ email recipient for: ${missingVendors.join(', ')}`
        );
    }

    return recipientsByQuote;
}

function getVendorPdfAttachmentId(quoteId: string): string {
    return `${RFQ_VENDOR_PDF_ATTACHMENT_PREFIX}${quoteId}`;
}

function getRfqFileAttachmentId(documentId: string): string {
    return `${RFQ_FILE_ATTACHMENT_PREFIX}${documentId}`;
}

function buildGeneratedPdfAttachmentPreview(
    quote: RfqVendorPdfQuote
): FeatureMailAttachmentPreview {
    return {
        id: getVendorPdfAttachmentId(quote.id),
        name: buildRfqVendorPdfFileName(quote),
        contentType: 'application/pdf',
        source: 'generated',
    };
}

function buildRfqFileAttachmentPreviews(quote: RfqVendorPdfQuote): FeatureMailAttachmentPreview[] {
    return quote.rfq.rfqattachments
        .filter(
            (attachment) => !attachment.document.deletedAt && attachment.document.type === 'FILE'
        )
        .map((attachment) => ({
            id: getRfqFileAttachmentId(attachment.documentId),
            name:
                attachment.document.displayName ||
                attachment.document.name ||
                attachment.documentId,
            contentType: attachment.document.mimeType || 'application/octet-stream',
            source: 'rfq',
        }));
}

function getUniqueAttachmentPreviews(
    attachments: FeatureMailAttachmentPreview[]
): FeatureMailAttachmentPreview[] {
    const seen = new Set<string>();

    return attachments.filter((attachment) => {
        if (seen.has(attachment.id)) return false;
        seen.add(attachment.id);
        return true;
    });
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

async function getDefaultVendorEmailRequest(
    quote: RfqVendorPdfQuote,
    signature: MailSignatureInput
): Promise<FeatureMailDraftBase> {
    const context = buildRfqVendorEmailContext(quote);

    return buildDefaultFeatureMailDraft({
        feature: RFQ_VENDOR_MAIL_FEATURE,
        context,
        to: getDefaultRfqVendorRecipientEmails(quote),
        signature,
    });
}

async function buildRfqVendorEmailDraft(
    quote: RfqVendorPdfQuote,
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): Promise<FeatureMailDraftResponse> {
    const template = await getFeatureMailTemplate(RFQ_VENDOR_MAIL_FEATURE);
    const availableAttachments = [
        buildGeneratedPdfAttachmentPreview(quote),
        ...buildRfqFileAttachmentPreviews(quote),
    ];
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const selectedRecipients = request
        ? (getSelectedRfqRecipientsByQuote([quote], request.to, {
              requireEveryVendor: mode === 'send',
          }).get(quote.id) ?? [])
        : getDefaultRfqVendorRecipientEmails(quote);
    const draft = {
        ...(request ?? (await getDefaultVendorEmailRequest(quote, signature))),
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
        recipientGroups: buildRfqVendorRecipientGroups([quote]),
    };
}

function buildRfqBulkEmailContext(quotes: RfqVendorPdfQuote[]): TemplateContext {
    const quote = quotes[0];

    if (!quote) {
        return {};
    }

    return {
        ...buildRfqVendorEmailContext(quote),
        recipientCount: quotes.length,
        vendorName: 'vendors',
    };
}

async function getDefaultAllVendorEmailRequest(
    quotes: RfqVendorPdfQuote[],
    signature: MailSignatureInput
): Promise<FeatureMailDraftBase> {
    return buildDefaultFeatureMailDraft({
        feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
        context: buildRfqBulkEmailContext(quotes),
        to: getDefaultRfqRecipientEmails(quotes),
        signature,
    });
}

async function buildRfqAllVendorEmailDraft(
    quotes: RfqVendorPdfQuote[],
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): Promise<FeatureMailDraftResponse> {
    const template = await getFeatureMailTemplate(RFQ_VENDOR_BULK_MAIL_FEATURE);
    const availableAttachments = getUniqueAttachmentPreviews([
        ...quotes.map(buildGeneratedPdfAttachmentPreview),
        ...buildRfqFileAttachmentPreviews(quotes[0]),
    ]);
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const selectedRecipients = request
        ? uniqueEmails(
              [
                  ...getSelectedRfqRecipientsByQuote(quotes, request.to, {
                      requireEveryVendor: mode === 'send',
                  }).values(),
              ].flat()
          )
        : getDefaultRfqRecipientEmails(quotes);
    const draft = {
        ...(request ?? (await getDefaultAllVendorEmailRequest(quotes, signature))),
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
        recipientGroups: buildRfqVendorRecipientGroups(quotes),
    };
}

async function buildSelectedRfqMailAttachments({
    quote,
    selectedAttachmentIds,
    requestedBy,
    pdfProfile,
    pdfRequest = {},
    fileAttachmentCache,
}: {
    quote: RfqVendorPdfQuote;
    selectedAttachmentIds: string[];
    requestedBy: string;
    pdfProfile: PdfProfile;
    pdfRequest?: GenerateVendorPdfRequest;
    fileAttachmentCache?: Map<string, MailAttachment>;
}): Promise<MailAttachment[]> {
    const selected = new Set(selectedAttachmentIds);
    const attachments: MailAttachment[] = [];

    if (selected.has(getVendorPdfAttachmentId(quote.id))) {
        const pdf = await RfqService.generateVendorPdf(
            quote.id,
            requestedBy,
            pdfProfile,
            pdfRequest
        );
        attachments.push({
            name: pdf.fileName,
            contentType: pdf.contentType,
            contentBytes: Buffer.from(pdf.bytes).toString('base64'),
        });
    }

    for (const rfqAttachment of quote.rfq.rfqattachments) {
        if (!selected.has(getRfqFileAttachmentId(rfqAttachment.documentId))) continue;

        attachments.push(
            await getFileMailAttachment(rfqAttachment.documentId, fileAttachmentCache)
        );
    }

    return attachments;
}

async function getFileMailAttachment(
    documentId: string,
    cache?: Map<string, MailAttachment>
): Promise<MailAttachment> {
    const cached = cache?.get(documentId);
    if (cached) return { ...cached };

    const file = await FileService.getFileContent(documentId);
    const attachment = {
        name: file.fileName,
        contentType: file.mimeType,
        contentBytes: Buffer.from(file.content).toString('base64'),
    };

    cache?.set(documentId, attachment);
    return { ...attachment };
}

function buildRfqVendorMailInput(
    draft: FeatureMailDraftResponse,
    to: string[],
    attachments: MailAttachment[] = []
): SendMailInput {
    return {
        from: draft.from,
        to,
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

function buildRfqPdfOptionsMetadata(
    pdfRequest: GenerateVendorPdfRequest
): Record<string, unknown> | undefined {
    const cleaned = cleanJsonValue(pdfRequest) as Record<string, unknown>;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function buildRfqVendorMailLogContext({
    feature,
    quote,
    userId,
    pdfRequest,
    activity,
}: {
    feature: FeatureMailKey;
    quote: RfqVendorPdfQuote;
    userId: string;
    pdfRequest?: GenerateVendorPdfRequest;
    activity?: LoggedMailContext['activity'];
}): LoggedMailContext {
    const pdfOptions = buildRfqPdfOptionsMetadata(pdfRequest ?? {});

    const metadata: Prisma.InputJsonValue = {
        quoteId: quote.id,
        rfqNumber: quote.rfq.rfqNumber,
        vendorName: quote.vendor.name,
        ...(pdfOptions ? { pdfOptions: pdfOptions as Prisma.InputJsonValue } : {}),
    };

    return {
        feature,
        entityType: 'rfq',
        entityId: quote.rfqId,
        relatedEntityType: 'vendor',
        relatedEntityId: quote.vendorId,
        createdBy: userId,
        metadata: {
            quoteId: quote.id,
            rfqNumber: quote.rfq.rfqNumber,
            vendorName: quote.vendor.name,
            ...(pdfOptions ? { pdfOptions } : {}),
        } as Prisma.InputJsonValue,
        activity,
    };
}

async function getRfqVendorQuote(quoteId: string): Promise<RfqVendorPdfQuote> {
    const quote = await prisma.rFQVendorQuote.findUnique({
        where: { id: quoteId },
        include: {
            vendor: { include: rfqVendorRecipientInclude },
            rfq: {
                include: {
                    project: true,
                    type: true,
                    rfqdeliverables: {
                        where: { deletedAt: null },
                        orderBy: { createdAt: 'asc' },
                        include: { unit: true },
                    },
                    rfqattachments: { include: { document: true } },
                },
            },
        },
    });

    if (!quote) throw new NotFoundError('Vendor quote not found');
    checkDeletedAt(quote.rfq);
    checkDeletedAt(quote.vendor);

    return quote;
}

async function getRfqVendorQuotes(rfqId: string): Promise<RfqVendorPdfQuote[]> {
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new NotFoundError('RFQ not found');
    checkDeletedAt(rfq);

    const quotes = await prisma.rFQVendorQuote.findMany({
        where: { rfqId },
        orderBy: { createdAt: 'asc' },
        include: {
            vendor: { include: rfqVendorRecipientInclude },
            rfq: {
                include: {
                    project: true,
                    type: true,
                    rfqdeliverables: {
                        where: { deletedAt: null },
                        orderBy: { createdAt: 'asc' },
                        include: { unit: true },
                    },
                    rfqattachments: { include: { document: true } },
                },
            },
        },
    });

    if (!quotes.length) throw new BadRequestError('RFQ has no invited vendors');

    for (const quote of quotes) {
        checkDeletedAt(quote.vendor);
    }

    return quotes;
}

export const RfqService = {
    createRfq: async (request: RfqCreateRequest, userId: string): Promise<RFQ> => {
        const { projectId, typeId, bidDeadline, deliverables, ...rest } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create an RFQ');
        }

        const type = await prisma.lookup.findUnique({ where: { id: typeId } });
        if (!type) throw new NotFoundError('RFQ type not found');

        const unitIds = [...new Set(deliverables.map((d) => d.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more deliverable units not found');
        }

        const costCodeIds = [
            ...new Set(deliverables.map((d) => d.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const prefix = `RFQ-${project.jobNumber}-`;
            const latest = await tx.rFQ.findFirst({
                where: { rfqNumber: { startsWith: prefix } },
                orderBy: { rfqNumber: 'desc' },
                select: { rfqNumber: true },
            });
            let seq = 1;
            if (latest?.rfqNumber) {
                const suffix = latest.rfqNumber.slice(prefix.length);
                seq = (parseInt(suffix, 10) || 0) + 1;
            }
            const rfqNumber = `${prefix}${String(seq).padStart(3, '0')}`;

            const rfq = await tx.rFQ.create({
                data: {
                    ...rest,
                    id: generateNanoId(),
                    rfqNumber,
                    projectId,
                    typeId,
                    bidDeadline: new Date(bidDeadline),
                    createdBy: userId,
                },
            });

            await tx.rFQDeliverable.createMany({
                data: deliverables.map((d) => ({
                    id: generateNanoId(),
                    rfqId: rfq.id,
                    name: d.name,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: rfq.id,
                action: 'create',
                description: `Created RFQ ${rfq.rfqNumber} on project ${project.name}`,
                affectedEntityIds: [projectId],
                tx,
            });

            return rfq;
        });
    },

    setDraft: async (id: string, userId: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const updated = await prisma.rFQ.update({
            where: { id },
            data: { status: 'DRAFT' },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'update',
            description: `Set RFQ ${updated.rfqNumber} to DRAFT`,
            affectedEntityIds: [rfq.projectId],
        });

        return updated;
    },

    updateRfq: async (request: RfqUpdateRequest, userId: string): Promise<RFQ> => {
        const { id, typeId, bidDeadline, deliverables, ...rest } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'DRAFT') {
            throw new BadRequestError('RFQ can only be updated while in DRAFT');
        }

        const type = await prisma.lookup.findUnique({ where: { id: typeId } });
        if (!type) throw new NotFoundError('RFQ type not found');

        const unitIds = [...new Set(deliverables.map((d) => d.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more deliverable units not found');
        }

        const costCodeIds = [
            ...new Set(deliverables.map((d) => d.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, { entityType: 'RFQ', entityId: id, userId });

            const updated = await tx.rFQ.update({
                where: { id },
                data: {
                    ...rest,
                    typeId,
                    bidDeadline: new Date(bidDeadline),
                },
            });

            await tx.rFQDeliverable.deleteMany({ where: { rfqId: id } });
            await tx.rFQDeliverable.createMany({
                data: deliverables.map((d) => ({
                    id: generateNanoId(),
                    rfqId: id,
                    name: d.name,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: id,
                action: 'update',
                description: `Updated RFQ ${updated.rfqNumber}`,
                affectedEntityIds: [rfq.projectId],
                tx,
            });

            return updated;
        });
    },

    deleteRfq: async (id: string, userId: string): Promise<void> => {
        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'DRAFT') {
            throw new BadRequestError('Only draft RFQs can be deleted');
        }

        await prisma.rFQ.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'delete',
            description: `Deleted RFQ ${rfq.rfqNumber}`,
            affectedEntityIds: [rfq.projectId],
        });
    },

    addVendor: async (request: AddVendorRequest, userId: string): Promise<RFQVendorQuote> => {
        const { rfqId, vendorId } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Vendors can only be added while RFQ is PUBLISHED');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        const existing = await prisma.rFQVendorQuote.findUnique({
            where: { rfqId_vendorId: { rfqId, vendorId } },
        });
        if (existing) throw new ConflictError('Vendor already added to this RFQ');

        const quote = await prisma.rFQVendorQuote.create({
            data: { id: generateNanoId(), rfqId, vendorId },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: rfqId,
            action: 'link',
            description: `Added vendor ${vendor.name} to RFQ ${rfq.rfqNumber}`,
            affectedEntityIds: [vendorId, rfq.projectId, quote.id],
        });

        return quote;
    },

    submitQuote: async (request: SubmitQuoteRequest, userId: string): Promise<RFQVendorQuote> => {
        const { id, quotedAmount, leadTime, attachments } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Quotes can only be submitted while RFQ is PUBLISHED');
        }
        if (quote.isAwarded) {
            throw new BadRequestError('Awarded quote cannot be modified');
        }
        if (quote.hasSubmittedQuote) {
            throw new BadRequestError('Quote already submitted — use edit to modify');
        }

        if (attachments.length) {
            const files = await prisma.file.findMany({
                where: { id: { in: attachments }, deletedAt: null },
                select: { id: true },
            });
            if (files.length !== new Set(attachments).size) {
                throw new NotFoundError('One or more attachment files not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.rFQVendorQuote.update({
                where: { id },
                data: {
                    quotedAmount,
                    leadTime: leadTime ?? null,
                    hasSubmittedQuote: true,
                    submittedAt: quote.submittedAt ?? new Date(),
                    declinedToQuote: false,
                    declineReason: null,
                },
            });

            await tx.vendorQuoteAttachment.deleteMany({ where: { quoteId: id } });
            if (attachments.length) {
                const folderId = await FileService.getOrCreateProjectEntityFolder(
                    { projectId: quote.rfq.projectId, entityType: 'RFQ', entityId: quote.rfq.id },
                    userId,
                    tx
                );
                for (const documentId of attachments) {
                    await FileService.moveFileToFolder(documentId, folderId, tx);
                }
                await tx.vendorQuoteAttachment.createMany({
                    data: attachments.map((documentId) => ({
                        id: generateNanoId(),
                        quoteId: id,
                        documentId,
                    })),
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: quote.rfqId,
                action: 'update',
                description: `Submitted quote from ${quote.vendor.name} on RFQ ${quote.rfq.rfqNumber}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id, ...attachments],
                tx,
            });

            return updated;
        });
    },

    editQuote: async (request: EditQuoteRequest, userId: string): Promise<RFQVendorQuote> => {
        const { id, quotedAmount, leadTime, attachments } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Quotes can only be edited while RFQ is PUBLISHED');
        }
        if (quote.isAwarded) {
            throw new BadRequestError('Awarded quote cannot be modified');
        }
        if (!quote.hasSubmittedQuote) {
            throw new BadRequestError('Quote not yet submitted — use submit instead');
        }

        if (attachments.length) {
            const files = await prisma.file.findMany({
                where: { id: { in: attachments }, deletedAt: null },
                select: { id: true },
            });
            if (files.length !== new Set(attachments).size) {
                throw new NotFoundError('One or more attachment files not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.rFQVendorQuote.update({
                where: { id },
                data: { quotedAmount, leadTime: leadTime ?? null },
            });

            await tx.vendorQuoteAttachment.deleteMany({ where: { quoteId: id } });
            if (attachments.length) {
                const folderId = await FileService.getOrCreateProjectEntityFolder(
                    { projectId: quote.rfq.projectId, entityType: 'RFQ', entityId: quote.rfq.id },
                    userId,
                    tx
                );
                for (const documentId of attachments) {
                    await FileService.moveFileToFolder(documentId, folderId, tx);
                }
                await tx.vendorQuoteAttachment.createMany({
                    data: attachments.map((documentId) => ({
                        id: generateNanoId(),
                        quoteId: id,
                        documentId,
                    })),
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: quote.rfqId,
                action: 'update',
                description: `Edited quote from ${quote.vendor.name} on RFQ ${quote.rfq.rfqNumber}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id, ...attachments],
                tx,
            });

            return updated;
        });
    },

    removeQuote: async (request: RemoveQuoteRequest, userId: string): Promise<RFQVendorQuote> => {
        const { id } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Quotes can only be removed while RFQ is PUBLISHED');
        }
        if (quote.isAwarded) {
            throw new BadRequestError('Awarded quote cannot be removed');
        }
        if (!quote.hasSubmittedQuote) {
            throw new BadRequestError('No submitted quote to remove');
        }

        return await prisma.$transaction(async (tx) => {
            await tx.vendorQuoteAttachment.deleteMany({ where: { quoteId: id } });

            const updated = await tx.rFQVendorQuote.update({
                where: { id },
                data: {
                    quotedAmount: null,
                    leadTime: null,
                    hasSubmittedQuote: false,
                    submittedAt: null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: quote.rfqId,
                action: 'update',
                description: `Removed submitted quote from ${quote.vendor.name} on RFQ ${quote.rfq.rfqNumber}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id],
                tx,
            });

            return updated;
        });
    },

    declineQuote: async (request: DeclineQuoteRequest, userId: string): Promise<RFQVendorQuote> => {
        const { id, declineReason } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Quotes can only be declined while RFQ is PUBLISHED');
        }
        if (quote.isAwarded) {
            throw new BadRequestError('Awarded quote cannot be declined');
        }
        if (quote.hasSubmittedQuote) {
            throw new BadRequestError('Submitted quote cannot be declined — remove it first');
        }
        if (quote.declinedToQuote) {
            throw new BadRequestError('Quote already declined');
        }

        const updated = await prisma.rFQVendorQuote.update({
            where: { id },
            data: {
                declinedToQuote: true,
                declineReason: declineReason ?? null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: quote.rfqId,
            action: 'update',
            description: `${quote.vendor.name} declined to quote on RFQ ${quote.rfq.rfqNumber}`,
            affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id],
        });

        return updated;
    },

    removeVendor: async (request: RemoveVendorRequest, userId: string): Promise<void> => {
        const { id } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('Vendor quotes can only be removed while RFQ is PUBLISHED');
        }
        if (quote.isAwarded) {
            throw new BadRequestError('Awarded quote cannot be removed');
        }

        await prisma.$transaction(async (tx) => {
            await tx.vendorQuoteAttachment.deleteMany({ where: { quoteId: id } });
            await tx.rFQVendorQuote.delete({ where: { id } });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: quote.rfqId,
                action: 'unlink',
                description: `Removed vendor quote from ${quote.vendor.name} on RFQ ${quote.rfq.rfqNumber}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id],
                tx,
            });
        });
    },

    addAttachment: async (
        request: AddRfqAttachmentRequest,
        userId: string
    ): Promise<RFQAttachment> => {
        const { rfqId, documentId } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while RFQ is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        const existing = await prisma.rFQAttachment.findUnique({ where: { documentId } });
        if (existing) throw new ConflictError('File already attached to an RFQ');

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getOrCreateProjectEntityFolder(
                { projectId: rfq.projectId, entityType: 'RFQ', entityId: rfq.id },
                userId,
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.rFQAttachment.create({
                data: { id: generateNanoId(), rfqId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: rfqId,
                action: 'link',
                description: `Attached file ${file.name} to RFQ ${rfq.rfqNumber}`,
                affectedEntityIds: [documentId, rfq.projectId],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (
        request: RemoveRfqAttachmentRequest,
        userId: string
    ): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.rFQAttachment.findUnique({
            where: { id },
            include: { rfq: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        if (attachment.rfq.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while RFQ is in DRAFT');
        }

        await prisma.rFQAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: attachment.rfqId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from RFQ ${attachment.rfq.rfqNumber}`,
            affectedEntityIds: [attachment.documentId, attachment.rfq.projectId],
        });
    },

    awardRfq: async (request: AwardRfqRequest, userId: string): Promise<RFQ> => {
        const { quoteId } = request;

        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id: quoteId },
            include: { rfq: true, vendor: true },
        });
        if (!quote) throw new NotFoundError('Vendor quote not found');
        if (quote.rfq.status !== 'PUBLISHED') {
            throw new BadRequestError('RFQ must be PUBLISHED to award');
        }
        if (!quote.hasSubmittedQuote || quote.quotedAmount === null) {
            throw new BadRequestError('Quote has not been submitted');
        }

        return await prisma.$transaction(async (tx) => {
            await tx.rFQVendorQuote.updateMany({
                where: { rfqId: quote.rfqId, isAwarded: true },
                data: { isAwarded: false },
            });

            await tx.rFQVendorQuote.update({
                where: { id: quoteId },
                data: { isAwarded: true },
            });

            const updated = await tx.rFQ.update({
                where: { id: quote.rfqId },
                data: {
                    status: 'AWARDED',
                    awardedVendorId: quote.vendorId,
                    awardedAmount: quote.quotedAmount,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: quote.rfqId,
                action: 'update',
                description: `Awarded RFQ ${updated.rfqNumber} to ${quote.vendor.name}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id],
                tx,
            });

            return updated;
        });
    },

    unawardRfq: async (request: UnawardRfqRequest, userId: string): Promise<RFQ> => {
        const { id } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'AWARDED') {
            throw new BadRequestError('RFQ is not awarded');
        }

        return await prisma.$transaction(async (tx) => {
            await tx.rFQVendorQuote.updateMany({
                where: { rfqId: id, isAwarded: true },
                data: { isAwarded: false },
            });

            const updated = await tx.rFQ.update({
                where: { id },
                data: {
                    status: 'PUBLISHED',
                    awardedVendorId: null,
                    awardedAmount: null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: id,
                action: 'update',
                description: `Un-awarded RFQ ${updated.rfqNumber}`,
                affectedEntityIds: [
                    rfq.projectId,
                    ...(rfq.awardedVendorId ? [rfq.awardedVendorId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    voidAwardRfq: async (id: string, request: VoidAwardRequest, userId: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: { awardedVendor: true },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'AWARDED') {
            throw new BadRequestError('Only awarded RFQs can have their award voided');
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.rFQ.update({
                where: { id },
                data: {
                    status: 'VOID',
                    cancellationReason: request.voidReason,
                },
            });

            const vendorText = rfq.awardedVendor ? ` to ${rfq.awardedVendor.name}` : '';

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: id,
                action: 'update',
                description: `Voided award for RFQ ${rfq.rfqNumber}${vendorText}: ${request.voidReason}`,
                affectedEntityIds: [
                    rfq.projectId,
                    ...(rfq.awardedVendorId ? [rfq.awardedVendorId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    setVoid: async (request: VoidRfqRequest, userId: string): Promise<RFQ> => {
        const { id, cancellationReason } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status === 'VOID') {
            throw new BadRequestError('RFQ is already voided');
        }
        if (rfq.status !== 'PUBLISHED' && rfq.status !== 'AWARDED') {
            throw new BadRequestError('Only published or awarded RFQs can be voided');
        }

        const updated = await prisma.rFQ.update({
            where: { id },
            data: { status: 'VOID', cancellationReason },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'update',
            description: `Voided RFQ ${updated.rfqNumber}`,
            affectedEntityIds: [rfq.projectId],
        });

        return updated;
    },

    getVendorEmailDraft: async (
        quoteId: string,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const quote = await getRfqVendorQuote(quoteId);
        return buildRfqVendorEmailDraft(quote, null, 'preview', signature);
    },

    previewVendorEmail: async (
        quoteId: string,
        request: FeatureMailDraftRequest,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const quote = await getRfqVendorQuote(quoteId);
        return buildRfqVendorEmailDraft(quote, request, 'preview', signature);
    },

    getAllVendorEmailDraft: async (
        rfqId: string,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const quotes = await getRfqVendorQuotes(rfqId);
        return buildRfqAllVendorEmailDraft(quotes, null, 'preview', signature);
    },

    previewAllVendorEmail: async (
        rfqId: string,
        request: FeatureMailDraftRequest,
        signature: MailSignatureInput
    ): Promise<FeatureMailDraftResponse> => {
        const quotes = await getRfqVendorQuotes(rfqId);
        return buildRfqAllVendorEmailDraft(quotes, request, 'preview', signature);
    },

    sendVendorEmail: async (
        quoteId: string,
        request: FeatureMailDraftRequest,
        requestedBy: string,
        userId: string,
        signature: MailSignatureInput,
        pdfRequest: GenerateVendorPdfRequest = {}
    ): Promise<FeatureMailSendResponse> => {
        if (!(await isAllowedFeatureMailSender(RFQ_VENDOR_MAIL_FEATURE, request.from))) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const quote = await getRfqVendorQuote(quoteId);
        const template = await getFeatureMailTemplate(RFQ_VENDOR_MAIL_FEATURE);
        const draft = await buildRfqVendorEmailDraft(quote, request, 'send', signature);
        if (!template.pdfProfile) {
            throw new BadRequestError('RFQ vendor mail PDF profile is not configured');
        }

        const mailInput = buildRfqVendorMailInput(draft, draft.to);
        const mailContext = buildRfqVendorMailLogContext({
            feature: RFQ_VENDOR_MAIL_FEATURE,
            quote,
            userId,
            pdfRequest,
            activity: {
                entityType: 'rfq',
                entityId: quote.rfqId,
                description: `Sent RFQ email to ${quote.vendor.name} for ${quote.rfq.rfqNumber}`,
                affectedEntityIds: [quote.vendorId, quote.rfq.projectId, quote.id],
            },
        });
        let attachments: MailAttachment[];

        try {
            const inlineAttachments = await buildSignatureInlineAttachments(template.signature);
            const selectedAttachments = await buildSelectedRfqMailAttachments({
                quote,
                selectedAttachmentIds: draft.attachmentIds,
                requestedBy,
                pdfProfile: template.pdfProfile,
                pdfRequest,
            });

            attachments = [...inlineAttachments, ...selectedAttachments];
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

    sendAllVendorEmail: async (
        rfqId: string,
        request: FeatureMailDraftRequest,
        requestedBy: string,
        userId: string,
        signature: MailSignatureInput,
        pdfRequest: GenerateVendorPdfRequest = {}
    ): Promise<FeatureMailSendResponse> => {
        if (!(await isAllowedFeatureMailSender(RFQ_VENDOR_BULK_MAIL_FEATURE, request.from))) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const quotes = await getRfqVendorQuotes(rfqId);
        const template = await getFeatureMailTemplate(RFQ_VENDOR_BULK_MAIL_FEATURE);
        const draft = await buildRfqAllVendorEmailDraft(quotes, request, 'send', signature);
        const recipientsByQuote = getSelectedRfqRecipientsByQuote(quotes, draft.to, {
            requireEveryVendor: true,
        });
        if (!template.pdfProfile) {
            throw new BadRequestError('RFQ vendor mail PDF profile is not configured');
        }

        const fileAttachmentCache = new Map<string, MailAttachment>();
        let sentAt = new Date();
        let inlineAttachments: MailAttachment[];

        try {
            inlineAttachments = await buildSignatureInlineAttachments(template.signature);
        } catch (error) {
            await Promise.all(
                quotes.map((quote) => {
                    const quoteRecipients = recipientsByQuote.get(quote.id) ?? [];
                    return logFailedMailAttempt(
                        buildRfqVendorMailInput(draft, quoteRecipients),
                        buildRfqVendorMailLogContext({
                            feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
                            quote,
                            userId,
                            pdfRequest,
                            activity: false,
                        }),
                        error
                    );
                })
            );
            throw error;
        }

        for (const quote of quotes) {
            const quoteRecipients = recipientsByQuote.get(quote.id) ?? [];
            const mailInput = buildRfqVendorMailInput(draft, quoteRecipients);
            const mailContext = buildRfqVendorMailLogContext({
                feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
                quote,
                userId,
                pdfRequest,
                activity: false,
            });
            let selectedAttachments: MailAttachment[];

            try {
                selectedAttachments = await buildSelectedRfqMailAttachments({
                    quote,
                    selectedAttachmentIds: draft.attachmentIds,
                    requestedBy,
                    pdfProfile: template.pdfProfile,
                    pdfRequest,
                    fileAttachmentCache,
                });
            } catch (error) {
                await logFailedMailAttempt(mailInput, mailContext, error);
                throw error;
            }

            const log = await sendLoggedMail(
                {
                    ...mailInput,
                    attachments: [...inlineAttachments, ...selectedAttachments],
                },
                mailContext
            );

            sentAt = log.sentAt ?? sentAt;
        }

        const rfq = quotes[0].rfq;
        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: rfqId,
            action: 'comment',
            description: `Sent RFQ email to ${quotes.length} vendors for ${rfq.rfqNumber}`,
            affectedEntityIds: [
                rfq.projectId,
                ...quotes.map((quote) => quote.vendorId),
                ...quotes.map((quote) => quote.id),
            ],
        });

        return {
            ...draft,
            sentAt: sentAt.toISOString(),
        };
    },

    generateVendorPdf: async (
        quoteId: string,
        requestedBy: string,
        pdfProfile?: PdfProfile | null,
        pdfRequest: GenerateVendorPdfRequest = {}
    ): Promise<RfqVendorPdfResult> => {
        const quote = await getRfqVendorQuote(quoteId);

        if (!quote.rfq.rfqdeliverables.length) {
            throw new BadRequestError('RFQ must have at least one deliverable to generate a PDF');
        }

        const fileName = buildRfqVendorPdfFileName(quote);
        const [resolvedPdfProfile, terms, notice] = await Promise.all([
            resolvePdfProfile(pdfProfile),
            PdfTermsService.resolveForRequest('rfq', pdfRequest),
            PdfNoticeService.resolveForRequest('rfq', pdfRequest),
        ]);
        const pdf = await renderPdf({
            template_id: RFQ_VENDOR_PDF_TEMPLATE_ID,
            data: buildRfqVendorPdfData(quote, requestedBy, resolvedPdfProfile, terms, notice),
            branding: {
                company_name: resolvedPdfProfile.company.name,
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

    saveVendorPdf: async (
        quoteId: string,
        requestedBy: string,
        userId: string,
        pdfRequest: GenerateVendorPdfRequest = {}
    ): Promise<SavedRfqVendorPdfResult> => {
        const pdf = await RfqService.generateVendorPdf(quoteId, requestedBy, null, pdfRequest);
        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id: quoteId },
            include: {
                vendor: true,
                rfq: {
                    select: {
                        id: true,
                        projectId: true,
                        rfqNumber: true,
                        deletedAt: true,
                    },
                },
            },
        });
        if (!quote) throw new NotFoundError('Vendor invite not found');
        checkDeletedAt(quote.rfq);

        const folderId = await FileService.getOrCreateProjectEntityFolder(
            { projectId: quote.rfq.projectId, entityType: 'RFQ', entityId: quote.rfq.id },
            userId
        );
        const savedFileName = buildSavedRfqVendorPdfFileName(pdf.fileName);
        const saved = await FileService.saveGeneratedFile(
            {
                name: savedFileName,
                displayName: savedFileName,
                parentId: folderId,
                mimeType: pdf.contentType,
                content: pdf.bytes,
                afterCreate: async (file, tx) => {
                    const attachment = await tx.rFQAttachment.create({
                        data: { id: generateNanoId(), rfqId: quote.rfq.id, documentId: file.id },
                    });

                    await ActivityLogService.log({
                        userId,
                        entityType: 'rfq',
                        entityId: quote.rfq.id,
                        action: 'create',
                        description: `Saved generated PDF ${file.name} to RFQ ${quote.rfq.rfqNumber}`,
                        affectedEntityIds: [file.id, quote.rfq.projectId, quote.vendorId, quote.id],
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

    getRfq: async (id: string): Promise<RFQ> => {
        const [rfq, sentEmailLogs] = await prisma.$transaction([
            prisma.rFQ.findUnique({
                where: { id },
                include: {
                    project: true,
                    type: true,
                    awardedVendor: true,
                    rfqdeliverables: { include: { unit: true } },
                    rfqattachments: { include: { document: true } },
                    purchaseOrders: {
                        where: { deletedAt: null, status: { not: 'CANCELLED' } },
                        select: {
                            id: true,
                            poNumber: true,
                            vendorId: true,
                            rfqId: true,
                            status: true,
                        },
                    },
                    vendorQuotes: {
                        include: {
                            vendor: { include: rfqVendorRecipientInclude },
                            attachments: { include: { document: true } },
                        },
                    },
                },
            }),
            prisma.sentEmailLog.findMany({
                where: {
                    entityType: 'rfq',
                    entityId: id,
                    relatedEntityType: 'vendor',
                    status: 'SENT',
                },
                orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
                select: {
                    id: true,
                    relatedEntityId: true,
                    from: true,
                    to: true,
                    subject: true,
                    sentAt: true,
                    createdAt: true,
                },
            }),
        ]);

        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const latestEmailByVendorId = new Map<string, (typeof sentEmailLogs)[number]>();

        for (const log of sentEmailLogs) {
            if (!log.relatedEntityId || latestEmailByVendorId.has(log.relatedEntityId)) continue;
            latestEmailByVendorId.set(log.relatedEntityId, log);
        }

        return {
            ...rfq,
            vendorQuotes: rfq.vendorQuotes.map((quote) => {
                const latestEmailLog = latestEmailByVendorId.get(quote.vendorId);

                return {
                    ...quote,
                    sentAt: latestEmailLog?.sentAt ?? null,
                    latestEmailLog: latestEmailLog
                        ? {
                              id: latestEmailLog.id,
                              from: latestEmailLog.from,
                              to: latestEmailLog.to,
                              subject: latestEmailLog.subject,
                              sentAt: latestEmailLog.sentAt,
                          }
                        : null,
                };
            }),
        } as RFQ;
    },

    getBidComparison: async (id: string): Promise<RfqBidComparison> => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: {
                rfqdeliverables: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    include: { unit: true },
                },
                vendorQuotes: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        vendor: true,
                        attachments: {
                            include: { document: true },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
        });

        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const submittedQuotes = rfq.vendorQuotes.filter(
            (quote) => quote.hasSubmittedQuote && quote.quotedAmount !== null
        );
        const quoteTotals = submittedQuotes
            .map((quote) => toNumber(quote.quotedAmount))
            .filter((value): value is number => value !== null);
        const lowestQuote = quoteTotals.length ? Math.min(...quoteTotals) : null;
        const highestQuote = quoteTotals.length ? Math.max(...quoteTotals) : null;
        const averageQuote = quoteTotals.length
            ? quoteTotals.reduce((sum, value) => sum + value, 0) / quoteTotals.length
            : null;

        return {
            rfq: {
                rfqNumber: rfq.rfqNumber,
                title: rfq.title,
                estimatedBudget: null,
                bidDeadline: rfq.bidDeadline,
                status: { id: rfq.status, name: rfq.status, label: rfq.status },
            },
            deliverables: rfq.rfqdeliverables.map((deliverable, index) => {
                const quantity = toNumber(deliverable.quantity) ?? 0;

                return {
                    id: deliverable.id,
                    sequenceNumber: index + 1,
                    description: deliverable.name,
                    quantity,
                    unit: deliverable.unit.label,
                    estimatedUnitPrice: null,
                    estimatedTotal: null,
                };
            }),
            quotes: submittedQuotes.map((quote) => {
                const quotedAmount = toNumber(quote.quotedAmount) ?? 0;
                const status = quote.isAwarded
                    ? { id: 'AWARDED', name: 'AWARDED', label: 'Awarded' }
                    : { id: 'QUOTED', name: 'QUOTED', label: 'Quoted' };

                return {
                    quoteId: quote.id,
                    vendorId: quote.vendorId,
                    vendorName: quote.vendor.name,
                    status,
                    totalAmount: quotedAmount,
                    taxAmount: null,
                    grandTotal: quotedAmount,
                    leadTimeDays: parseLeadTimeDays(quote.leadTime),
                    warrantyPeriod: null,
                    isResponsive: null,
                    attachments: quote.attachments
                        .filter((attachment) => !attachment.document.deletedAt)
                        .map((attachment) => ({
                            id: attachment.id,
                            documentId: attachment.documentId,
                            document: {
                                id: attachment.document.id,
                                name:
                                    attachment.document.displayName ||
                                    attachment.document.name ||
                                    attachment.document.id,
                                ...(attachment.document.mimeType
                                    ? { mimeType: attachment.document.mimeType }
                                    : {}),
                            },
                        })),
                    lineItems: [],
                };
            }),
            statistics: {
                lowestQuote,
                highestQuote,
                averageQuote,
                medianQuote: getMedian(quoteTotals),
                quotesSubmitted: submittedQuotes.length,
                quotesExpected: rfq.vendorQuotes.length,
                budgetVariance: null,
            },
        };
    },

    getRfqs: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<{
        data: RfqListItem[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, status, typeId, awardedVendorId, ...restFilter } = filter || {};

        const whereClause: Prisma.RFQWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(typeId && { typeId }),
            ...(awardedVendorId && { awardedVendorId }),
            ...(search && {
                OR: [
                    { rfqNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const scopedWhereClause: Prisma.RFQWhereInput =
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

        const [count, rfqs] = await prisma.$transaction([
            prisma.rFQ.count({ where: scopedWhereClause }),
            prisma.rFQ.findMany({
                where: scopedWhereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof RFQ]: sortOrder,
                },
                include: {
                    project: true,
                    type: true,
                    awardedVendor: true,
                    vendorQuotes: {
                        select: {
                            hasSubmittedQuote: true,
                        },
                    },
                },
            }),
        ]);

        const data = rfqs.map(({ vendorQuotes, ...rfq }) => ({
            ...rfq,
            _count: {
                invites: vendorQuotes.length,
                quotes: vendorQuotes.filter((quote) => quote.hasSubmittedQuote).length,
            },
        }));

        return { data, count };
    },

    setPublished: async (id: string, userId: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const updated = await prisma.rFQ.update({
            where: { id },
            data: { status: 'PUBLISHED' },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'update',
            description: `Set RFQ ${updated.rfqNumber} to PUBLISHED`,
            affectedEntityIds: [rfq.projectId],
        });

        return updated;
    },
};
