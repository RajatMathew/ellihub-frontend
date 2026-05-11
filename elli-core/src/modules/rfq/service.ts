import { Buffer } from 'node:buffer';

import { RFQ, RFQAttachment, RFQVendorQuote, type Prisma } from '@db/client';
import { renderPdf, type PdfJsonObject } from '@lib/pdf-engine';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
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
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    type GenerateVendorPdfRequest,
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
    VoidRfqRequest,
} from './models';

import type {
    FeatureMailDraftRequest,
    FeatureMailDraftResponse,
    FeatureMailAttachmentPreview,
    FeatureMailKey,
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

type RfqVendorPdfQuote = Prisma.RFQVendorQuoteGetPayload<{
    include: {
        vendor: true;
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
    pdfRequest: GenerateVendorPdfRequest
): PdfJsonObject {
    const shipToName = pdfRequest.shipToName;
    const logoPath = pdfRequest.company.logoPath || 'assets/logo.png';
    return {
        company: {
            name: pdfRequest.company.name,
            address_lines: pdfRequest.company.addressLines,
            phone: pdfRequest.company.phone,
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
        footer: {
            left: `${pdfRequest.company.name} - ${quote.rfq.rfqNumber}`,
        },
    };
}

function buildRfqVendorPdfFileName(quote: RfqVendorPdfQuote): string {
    return sanitizeFileName(`${quote.rfq.rfqNumber}-${quote.vendor.name}-request-for-quote.pdf`);
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

function getVendorEmail(quote: RfqVendorPdfQuote): string {
    const email = quote.vendor.email?.trim().toLowerCase();

    if (!email) {
        throw new BadRequestError(`Vendor ${quote.vendor.name} does not have an email address`);
    }

    return email;
}

function getUniqueVendorEmails(quotes: RfqVendorPdfQuote[]): string[] {
    return [...new Set(quotes.map(getVendorEmail))];
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

function getDefaultVendorEmailRequest(
    quote: RfqVendorPdfQuote,
    signature: MailSignatureInput
): FeatureMailDraftRequest {
    const context = buildRfqVendorEmailContext(quote);

    return buildDefaultFeatureMailDraft({
        feature: RFQ_VENDOR_MAIL_FEATURE,
        context,
        to: [getVendorEmail(quote)],
        signature,
    });
}

function buildRfqVendorEmailDraft(
    quote: RfqVendorPdfQuote,
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): FeatureMailDraftResponse {
    const template = getFeatureMailTemplate(RFQ_VENDOR_MAIL_FEATURE);
    const availableAttachments = [
        buildGeneratedPdfAttachmentPreview(quote),
        ...buildRfqFileAttachmentPreviews(quote),
    ];
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const draft = {
        ...(request ?? getDefaultVendorEmailRequest(quote, signature)),
        signature,
        to: [getVendorEmail(quote)],
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

function getDefaultAllVendorEmailRequest(
    quotes: RfqVendorPdfQuote[],
    signature: MailSignatureInput
): FeatureMailDraftRequest {
    return buildDefaultFeatureMailDraft({
        feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
        context: buildRfqBulkEmailContext(quotes),
        to: getUniqueVendorEmails(quotes),
        signature,
    });
}

function buildRfqAllVendorEmailDraft(
    quotes: RfqVendorPdfQuote[],
    request: FeatureMailDraftRequest | null,
    mode: 'preview' | 'send',
    signature: MailSignatureInput
): FeatureMailDraftResponse {
    const template = getFeatureMailTemplate(RFQ_VENDOR_BULK_MAIL_FEATURE);
    const availableAttachments = getUniqueAttachmentPreviews([
        ...quotes.map(buildGeneratedPdfAttachmentPreview),
        ...buildRfqFileAttachmentPreviews(quotes[0]),
    ]);
    const attachmentIds = resolveSelectedAttachmentIds(request, availableAttachments);
    const draft = {
        ...(request ?? getDefaultAllVendorEmailRequest(quotes, signature)),
        signature,
        to: getUniqueVendorEmails(quotes),
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
    };
}

async function buildSelectedRfqMailAttachments({
    quote,
    selectedAttachmentIds,
    requestedBy,
    pdfProfile,
    fileAttachmentCache,
}: {
    quote: RfqVendorPdfQuote;
    selectedAttachmentIds: string[];
    requestedBy: string;
    pdfProfile: GenerateVendorPdfRequest;
    fileAttachmentCache?: Map<string, MailAttachment>;
}): Promise<MailAttachment[]> {
    const selected = new Set(selectedAttachmentIds);
    const attachments: MailAttachment[] = [];

    if (selected.has(getVendorPdfAttachmentId(quote.id))) {
        const pdf = await RfqService.generateVendorPdf(quote.id, requestedBy, pdfProfile);
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

function buildRfqVendorMailLogContext({
    feature,
    quote,
    userId,
    activity,
}: {
    feature: FeatureMailKey;
    quote: RfqVendorPdfQuote;
    userId: string;
    activity?: LoggedMailContext['activity'];
}): LoggedMailContext {
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
        },
        activity,
    };
}

async function getRfqVendorQuote(quoteId: string): Promise<RfqVendorPdfQuote> {
    const quote = await prisma.rFQVendorQuote.findUnique({
        where: { id: quoteId },
        include: {
            vendor: true,
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
            vendor: true,
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
                    id: ulid(),
                    rfqNumber,
                    projectId,
                    typeId,
                    bidDeadline: new Date(bidDeadline),
                    createdBy: userId,
                },
            });

            await tx.rFQDeliverable.createMany({
                data: deliverables.map((d) => ({
                    id: ulid(),
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
                    id: ulid(),
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
            data: { id: ulid(), rfqId, vendorId },
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
                const folderId = await FileService.getProjectSubFolderId(
                    quote.rfq.projectId,
                    'RFQ',
                    tx
                );
                for (const documentId of attachments) {
                    await FileService.moveFileToFolder(documentId, folderId, tx);
                }
                await tx.vendorQuoteAttachment.createMany({
                    data: attachments.map((documentId) => ({
                        id: ulid(),
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
                const folderId = await FileService.getProjectSubFolderId(
                    quote.rfq.projectId,
                    'RFQ',
                    tx
                );
                for (const documentId of attachments) {
                    await FileService.moveFileToFolder(documentId, folderId, tx);
                }
                await tx.vendorQuoteAttachment.createMany({
                    data: attachments.map((documentId) => ({
                        id: ulid(),
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
            const folderId = await FileService.getProjectSubFolderId(rfq.projectId, 'RFQ', tx);
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.rFQAttachment.create({
                data: { id: ulid(), rfqId, documentId },
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

    setVoid: async (request: VoidRfqRequest, userId: string): Promise<RFQ> => {
        const { id, cancellationReason } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status === 'VOID') {
            throw new BadRequestError('RFQ is already voided');
        }
        if (rfq.status === 'AWARDED') {
            throw new BadRequestError('Awarded RFQ cannot be voided');
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
        signature: MailSignatureInput
    ): Promise<FeatureMailSendResponse> => {
        if (!isAllowedFeatureMailSender(RFQ_VENDOR_MAIL_FEATURE, request.from)) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const quote = await getRfqVendorQuote(quoteId);
        const template = getFeatureMailTemplate(RFQ_VENDOR_MAIL_FEATURE);
        const draft = buildRfqVendorEmailDraft(quote, request, 'send', signature);
        if (!template.pdfProfile) {
            throw new BadRequestError('RFQ vendor mail PDF profile is not configured');
        }

        const mailInput = buildRfqVendorMailInput(draft, draft.to);
        const mailContext = buildRfqVendorMailLogContext({
            feature: RFQ_VENDOR_MAIL_FEATURE,
            quote,
            userId,
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
        signature: MailSignatureInput
    ): Promise<FeatureMailSendResponse> => {
        if (!isAllowedFeatureMailSender(RFQ_VENDOR_BULK_MAIL_FEATURE, request.from)) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        const quotes = await getRfqVendorQuotes(rfqId);
        const template = getFeatureMailTemplate(RFQ_VENDOR_BULK_MAIL_FEATURE);
        const draft = buildRfqAllVendorEmailDraft(quotes, request, 'send', signature);
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
                quotes.map((quote) =>
                    logFailedMailAttempt(
                        buildRfqVendorMailInput(draft, [getVendorEmail(quote)]),
                        buildRfqVendorMailLogContext({
                            feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
                            quote,
                            userId,
                            activity: false,
                        }),
                        error
                    )
                )
            );
            throw error;
        }

        for (const quote of quotes) {
            const mailInput = buildRfqVendorMailInput(draft, [getVendorEmail(quote)]);
            const mailContext = buildRfqVendorMailLogContext({
                feature: RFQ_VENDOR_BULK_MAIL_FEATURE,
                quote,
                userId,
                activity: false,
            });
            let selectedAttachments: MailAttachment[];

            try {
                selectedAttachments = await buildSelectedRfqMailAttachments({
                    quote,
                    selectedAttachmentIds: draft.attachmentIds,
                    requestedBy,
                    pdfProfile: template.pdfProfile,
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
        pdfRequest: GenerateVendorPdfRequest
    ): Promise<RfqVendorPdfResult> => {
        const quote = await getRfqVendorQuote(quoteId);

        if (!quote.rfq.rfqdeliverables.length) {
            throw new BadRequestError('RFQ must have at least one deliverable to generate a PDF');
        }

        const fileName = buildRfqVendorPdfFileName(quote);
        const pdf = await renderPdf({
            template_id: RFQ_VENDOR_PDF_TEMPLATE_ID,
            data: buildRfqVendorPdfData(quote, requestedBy, pdfRequest),
            branding: {
                company_name: pdfRequest.company.name,
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
                    vendorQuotes: {
                        include: {
                            vendor: true,
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

    getRfqs: async (
        params: PaginationParams
    ): Promise<{
        data: RFQ[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, status, typeId, awardedVendorId, ...restFilter } = filter || {};

        const whereClause = {
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

        const [count, data] = await prisma.$transaction([
            prisma.rFQ.count({ where: whereClause }),
            prisma.rFQ.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof RFQ]: sortOrder,
                },
                include: {
                    project: true,
                    type: true,
                    awardedVendor: true,
                },
            }),
        ]);

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
