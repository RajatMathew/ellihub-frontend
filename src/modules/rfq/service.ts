import { RFQ, RFQAttachment, RFQVendorQuote } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

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
    VoidRfqRequest,
} from './models';

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

    getRfq: async (id: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({
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
        });

        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        return rfq;
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
