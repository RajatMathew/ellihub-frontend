import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    AddendumCreateRequest,
    AwardRequest,
    CancelRequest,
    ChangeStatusRequest,
    DeclineRequest,
    DeliverableCreateRequest,
    DeliverableUpdateRequest,
    PublishRequest,
    QuoteCreateRequest,
    QuoteUpdateRequest,
    RFQCreateRequest,
    RFQUpdateRequest,
    VendorInviteRequest,
    VoidAwardRequest,
} from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const rfqListSelect = {
    id: true,
    rfqNumber: true,
    title: true,
    status: statusSelect,
    bidDeadline: true,
    estimatedBudget: true,
    biddingType: true,
    project: { select: { id: true, name: true, jobNumber: true } },
    _count: {
        select: {
            invites: true,
            quotes: { where: { deletedAt: null } },
        },
    },
    createdAt: true,
} as const;

const rfqDetailInclude = {
    project: { select: { id: true, name: true, jobNumber: true } },
    status: statusSelect,
    costCode: { select: { id: true, name: true, code: true } },
    awardedVendor: { select: { id: true, name: true } },
    deliverables: {
        orderBy: { sequenceNumber: 'asc' as const },
    },
    invites: {
        include: { vendor: { select: { id: true, name: true, email: true, phone: true } } },
    },
    quotes: {
        where: { deletedAt: null },
        include: {
            vendor: { select: { id: true, name: true } },
            status: statusSelect,
            lineItems: true,
        },
    },
    attachments: {
        include: { document: { select: { id: true, name: true } } },
    },
    addendums: {
        orderBy: { addendumNumber: 'asc' as const },
        include: { changeType: { select: { id: true, name: true, code: true, color: true } } },
    },
    generatedPO: { select: { id: true, poNumber: true } },
    purchaseOrders: {
        where: { deletedAt: null },
        select: { id: true, poNumber: true, vendorId: true, awardedQuoteId: true },
    },
};

async function getRFQStatusByName(name: string) {
    const status = await prisma.rFQStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`RFQ status '${name}' not configured`);
    return status;
}

async function getQuoteStatusByName(name: string) {
    const status = await prisma.quoteStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`Quote status '${name}' not configured`);
    return status;
}

async function getRFQOrThrow(id: string) {
    const rfq = await prisma.rFQ.findUnique({
        where: { id },
        include: { status: { select: { name: true } } },
    });
    if (!rfq) throw new NotFoundError('RFQ not found');
    checkDeletedAt(rfq);
    return rfq;
}

export const RFQService = {
    // --- CRUD (BE-RFQ-02) ---

    listRFQs: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            projectId,
            statusId,
            costCodeId,
            bidDeadlineAfter,
            bidDeadlineBefore,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(statusId && { statusId }),
            ...(costCodeId && { costCodeId }),
        };

        const andConditions: unknown[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { rfqNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            });
        }

        if (bidDeadlineAfter) {
            andConditions.push({ bidDeadline: { gte: new Date(bidDeadlineAfter as string) } });
        }
        if (bidDeadlineBefore) {
            andConditions.push({ bidDeadline: { lte: new Date(bidDeadlineBefore as string) } });
        }

        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.rFQ.count({ where: whereClause }),
            prisma.rFQ.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: rfqListSelect,
            }),
        ]);

        return { data, count };
    },

    createRFQ: async (data: RFQCreateRequest, userId: string) => {
        const { deliverables, ...rfqData } = data;

        // Validate project
        const project = await prisma.project.findUnique({
            where: { id: rfqData.projectId },
            select: { id: true, jobNumber: true, deletedAt: true },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        // Validate costCode if provided
        if (rfqData.costCodeId) {
            const costCode = await prisma.costCode.findUnique({
                where: { id: rfqData.costCodeId },
            });
            if (!costCode) throw new NotFoundError('Cost code not found');
        }

        // Get default DRAFT status
        const draftStatus = await getRFQStatusByName('DRAFT');

        return await prisma.$transaction(async (tx) => {
            // Auto-generate rfqNumber
            const jobNumber = project.jobNumber || 'UNKNOWN';
            const latest = await tx.rFQ.findFirst({
                where: { projectId: rfqData.projectId },
                orderBy: { rfqNumber: 'desc' },
                select: { rfqNumber: true },
            });

            let seq = 1;
            if (latest?.rfqNumber) {
                const parts = latest.rfqNumber.split('-');
                const lastPart = parts[parts.length - 1];
                seq = (parseInt(lastPart, 10) || 0) + 1;
            }
            const rfqNumber = `RFQ-${jobNumber}-${String(seq).padStart(3, '0')}`;

            const rfqId = ulid();

            await tx.rFQ.create({
                data: {
                    id: rfqId,
                    rfqNumber,
                    projectId: rfqData.projectId,
                    title: rfqData.title,
                    description: rfqData.description,
                    costCodeId: rfqData.costCodeId,
                    estimatedBudget: rfqData.estimatedBudget,
                    bidDeadline: rfqData.bidDeadline,
                    biddingType: rfqData.biddingType || 'ANONYMOUS',
                    minimumVendors: rfqData.minimumVendors ?? 3,
                    statusId: draftStatus.id,
                    createdBy: userId,
                },
            });

            // Create deliverables
            for (let i = 0; i < deliverables.length; i++) {
                const d = deliverables[i];
                const estimatedTotal =
                    d.estimatedUnitPrice != null ? d.estimatedUnitPrice * d.quantity : null;

                await tx.rFQDeliverable.create({
                    data: {
                        id: ulid(),
                        rfqId,
                        sequenceNumber: i + 1,
                        description: d.description,
                        specifications: d.specifications,
                        quantity: d.quantity,
                        unit: d.unit,
                        costCodeId: d.costCodeId,
                        estimatedUnitPrice: d.estimatedUnitPrice,
                        estimatedTotal,
                    },
                });
            }

            return await tx.rFQ.findUniqueOrThrow({
                where: { id: rfqId },
                include: rfqDetailInclude,
            });
        });
    },

    getRFQ: async (id: string) => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id },
            include: rfqDetailInclude,
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        return rfq;
    },

    updateRFQ: async (id: string, data: RFQUpdateRequest) => {
        const rfq = await getRFQOrThrow(id);
        const terminal = ['CANCELLED', 'VOID'];
        if (terminal.includes(rfq.status.name)) {
            throw new BadRequestError('Cannot edit a cancelled or voided RFQ.');
        }

        // Validate costCode if provided
        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new NotFoundError('Cost code not found');
        }

        return await prisma.rFQ.update({
            where: { id },
            data,
            include: rfqDetailInclude,
        });
    },

    changeRFQStatus: async (id: string, data: ChangeStatusRequest) => {
        await getRFQOrThrow(id);

        const status = await prisma.rFQStatus.findUnique({ where: { id: data.statusId } });
        if (!status) throw new NotFoundError('Status not found');

        return await prisma.rFQ.update({
            where: { id },
            data: { statusId: data.statusId },
            include: rfqDetailInclude,
        });
    },

    deleteRFQ: async (id: string) => {
        const rfq = await getRFQOrThrow(id);
        if (rfq.status.name !== 'DRAFT') {
            throw new BadRequestError('Cannot delete a non-DRAFT RFQ');
        }

        await prisma.rFQ.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    // --- Deliverables (BE-RFQ-03) ---

    addDeliverable: async (rfqId: string, data: DeliverableCreateRequest) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (['CANCELLED', 'VOID'].includes(rfq.status.name)) {
            throw new BadRequestError('Cannot modify deliverables on a cancelled or voided RFQ');
        }

        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new NotFoundError('Cost code not found');
        }

        const maxSeq = await prisma.rFQDeliverable.aggregate({
            where: { rfqId },
            _max: { sequenceNumber: true },
        });

        const estimatedTotal =
            data.estimatedUnitPrice != null ? data.estimatedUnitPrice * data.quantity : null;

        return await prisma.rFQDeliverable.create({
            data: {
                id: ulid(),
                rfqId,
                sequenceNumber: (maxSeq._max.sequenceNumber || 0) + 1,
                description: data.description,
                specifications: data.specifications,
                quantity: data.quantity,
                unit: data.unit,
                costCodeId: data.costCodeId,
                estimatedUnitPrice: data.estimatedUnitPrice,
                estimatedTotal,
            },
        });
    },

    updateDeliverable: async (
        rfqId: string,
        deliverableId: string,
        data: DeliverableUpdateRequest
    ) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (['CANCELLED', 'VOID'].includes(rfq.status.name)) {
            throw new BadRequestError('Cannot modify deliverables on a cancelled or voided RFQ');
        }

        const deliverable = await prisma.rFQDeliverable.findFirst({
            where: { id: deliverableId, rfqId },
        });
        if (!deliverable) throw new NotFoundError('Deliverable not found');

        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new NotFoundError('Cost code not found');
        }

        // Recalculate estimatedTotal if quantity or estimatedUnitPrice changed
        const qty = data.quantity ?? Number(deliverable.quantity);
        const price =
            data.estimatedUnitPrice !== undefined
                ? data.estimatedUnitPrice
                : deliverable.estimatedUnitPrice
                  ? Number(deliverable.estimatedUnitPrice)
                  : null;

        const estimatedTotal = price != null ? price * qty : null;

        return await prisma.rFQDeliverable.update({
            where: { id: deliverableId },
            data: { ...data, estimatedTotal },
        });
    },

    removeDeliverable: async (rfqId: string, deliverableId: string) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (['CANCELLED', 'VOID'].includes(rfq.status.name)) {
            throw new BadRequestError('Cannot modify deliverables on a cancelled or voided RFQ');
        }

        const deliverable = await prisma.rFQDeliverable.findFirst({
            where: { id: deliverableId, rfqId },
        });
        if (!deliverable) throw new NotFoundError('Deliverable not found');

        const count = await prisma.rFQDeliverable.count({ where: { rfqId } });
        if (count <= 1) {
            throw new BadRequestError('RFQ must have at least one deliverable');
        }

        await prisma.rFQDeliverable.delete({ where: { id: deliverableId } });
    },

    // --- Vendor Invitations (BE-RFQ-04) ---

    inviteVendors: async (rfqId: string, data: VendorInviteRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name !== 'PUBLISHED') {
            throw new BadRequestError('Can only invite vendors to a PUBLISHED RFQ');
        }

        // Validate all vendors exist
        const vendors = await prisma.vendor.findMany({
            where: { id: { in: data.vendorIds }, deletedAt: null },
        });
        if (vendors.length !== data.vendorIds.length) {
            throw new NotFoundError('One or more vendors not found');
        }

        // Check for duplicates
        const existing = await prisma.rFQVendorInvite.findMany({
            where: { rfqId, vendorId: { in: data.vendorIds } },
        });
        if (existing.length > 0) {
            throw new BadRequestError('One or more vendors already invited');
        }

        const invites = [];
        for (const vendorId of data.vendorIds) {
            const invite = await prisma.rFQVendorInvite.create({
                data: {
                    id: ulid(),
                    rfqId,
                    vendorId,
                    invitedBy: userId,
                    inviteEmailSentAt: new Date(),
                    inviteEmailStatus: 'SENT',
                },
                include: { vendor: { select: { id: true, name: true, email: true, phone: true } } },
            });
            invites.push(invite);
            console.log(`Send RFQ invitation email to vendor ${vendorId}`);
        }

        return invites;
    },

    listInvites: async (rfqId: string) => {
        await getRFQOrThrow(rfqId);
        return await prisma.rFQVendorInvite.findMany({
            where: { rfqId },
            include: { vendor: { select: { id: true, name: true, email: true, phone: true } } },
        });
    },

    declineInvite: async (rfqId: string, inviteId: string, data: DeclineRequest) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name !== 'PUBLISHED') {
            throw new BadRequestError('RFQ is not in PUBLISHED status');
        }

        const invite = await prisma.rFQVendorInvite.findFirst({
            where: { id: inviteId, rfqId },
        });
        if (!invite) throw new NotFoundError('Invite not found');

        if (invite.hasSubmittedQuote) {
            throw new BadRequestError('Cannot decline — vendor already has a submitted quote');
        }

        return await prisma.rFQVendorInvite.update({
            where: { id: inviteId },
            data: {
                declinedToQuote: true,
                declinedAt: new Date(),
                declineReason: data.declineReason,
            },
            include: { vendor: { select: { id: true, name: true, email: true, phone: true } } },
        });
    },

    // --- Quotes (BE-RFQ-04) ---

    createQuote: async (rfqId: string, data: QuoteCreateRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name !== 'PUBLISHED' && rfq.status.name !== 'EVALUATION') {
            throw new BadRequestError('RFQ must be PUBLISHED or in EVALUATION to accept quotes');
        }

        // Vendor must be invited
        const invite = await prisma.rFQVendorInvite.findFirst({
            where: { rfqId, vendorId: data.vendorId },
        });
        if (!invite) throw new BadRequestError('Vendor not invited to this RFQ');

        // One quote per vendor per RFQ
        const existingQuote = await prisma.vendorQuote.findFirst({
            where: { rfqId, vendorId: data.vendorId, deletedAt: null },
        });
        if (existingQuote) throw new BadRequestError('Quote already exists for this vendor');

        // Get default quote status
        const draftQuoteStatus = await getQuoteStatusByName('DRAFT');

        return await prisma.$transaction(async (tx) => {
            const quoteId = ulid();

            // Compute totals from line items
            let totalAmount = 0;
            const lineItemsData = data.lineItems.map((li) => {
                const lineTotal = li.unitPrice * li.quantity;
                totalAmount += lineTotal;
                return {
                    id: ulid(),
                    quoteId,
                    deliverableId: li.deliverableId,
                    unitPrice: li.unitPrice,
                    quantity: li.quantity,
                    unit: li.unit,
                    lineTotal,
                    notes: li.notes,
                    alternateProposed: li.alternateProposed || false,
                    alternateDescription: li.alternateDescription,
                };
            });

            const taxAmount = data.taxAmount || 0;
            const grandTotal = totalAmount + taxAmount;

            const quoteValidUntil =
                data.quoteValidDays != null
                    ? new Date(Date.now() + data.quoteValidDays * 86400000)
                    : null;

            await tx.vendorQuote.create({
                data: {
                    id: quoteId,
                    rfqId,
                    vendorId: data.vendorId,
                    statusId: draftQuoteStatus.id,
                    enteredBy: userId,
                    totalAmount,
                    taxAmount: data.taxAmount ?? 0,
                    grandTotal,
                    leadTimeDays: data.leadTimeDays,
                    deliveryDate: data.deliveryDate,
                    paymentTerms: data.paymentTerms,
                    warrantyPeriod: data.warrantyPeriod,
                    quoteValidDays: data.quoteValidDays,
                    quoteValidUntil,
                    notes: data.notes,
                    qualifications: data.qualifications,
                    submittedBy: data.submittedBy,
                    submittedByEmail: data.submittedByEmail,
                    submittedByPhone: data.submittedByPhone,
                    submittedAt: data.submittedAt,
                },
            });

            for (const li of lineItemsData) {
                await tx.quoteLineItem.create({ data: li });
            }

            // Update invite
            await tx.rFQVendorInvite.update({
                where: { id: invite.id },
                data: {
                    hasSubmittedQuote: true,
                    submittedAt: data.submittedAt || new Date(),
                },
            });

            return await tx.vendorQuote.findUniqueOrThrow({
                where: { id: quoteId },
                include: {
                    vendor: { select: { id: true, name: true } },
                    status: statusSelect,
                    lineItems: true,
                },
            });
        });
    },

    updateQuote: async (rfqId: string, quoteId: string, data: QuoteUpdateRequest) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name === 'AWARDED') {
            throw new BadRequestError('Cannot edit quotes on an AWARDED RFQ');
        }

        const quote = await prisma.vendorQuote.findFirst({
            where: { id: quoteId, rfqId, deletedAt: null },
            include: { status: { select: { name: true } } },
        });
        if (!quote) throw new NotFoundError('Quote not found');

        if (quote.status.name !== 'DRAFT' && quote.status.name !== 'SUBMITTED') {
            throw new BadRequestError('Can only edit DRAFT or SUBMITTED quotes');
        }

        return await prisma.$transaction(async (tx) => {
            const updateData: Record<string, unknown> = {};

            // If line items provided, replace them
            if (data.lineItems) {
                await tx.quoteLineItem.deleteMany({ where: { quoteId } });

                let totalAmount = 0;
                for (const li of data.lineItems) {
                    const lineTotal = li.unitPrice * li.quantity;
                    totalAmount += lineTotal;
                    await tx.quoteLineItem.create({
                        data: {
                            id: ulid(),
                            quoteId,
                            deliverableId: li.deliverableId,
                            unitPrice: li.unitPrice,
                            quantity: li.quantity,
                            unit: li.unit,
                            lineTotal,
                            notes: li.notes,
                            alternateProposed: li.alternateProposed || false,
                            alternateDescription: li.alternateDescription,
                        },
                    });
                }

                updateData.totalAmount = totalAmount;
                const taxAmount =
                    data.taxAmount !== undefined ? (data.taxAmount ?? 0) : Number(quote.taxAmount);
                updateData.taxAmount = taxAmount;
                updateData.grandTotal = totalAmount + taxAmount;
            }

            // Copy scalar fields
            const scalarFields = [
                'leadTimeDays',
                'deliveryDate',
                'paymentTerms',
                'warrantyPeriod',
                'quoteValidDays',
                'notes',
                'qualifications',
                'submittedBy',
                'submittedByEmail',
                'submittedByPhone',
                'submittedAt',
            ] as const;

            for (const field of scalarFields) {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            }

            if (data.quoteValidDays !== undefined) {
                updateData.quoteValidUntil =
                    data.quoteValidDays != null
                        ? new Date(Date.now() + data.quoteValidDays * 86400000)
                        : null;
            }

            return await tx.vendorQuote.update({
                where: { id: quoteId },
                data: updateData,
                include: {
                    vendor: { select: { id: true, name: true } },
                    status: statusSelect,
                    lineItems: true,
                },
            });
        });
    },

    deleteQuote: async (rfqId: string, quoteId: string) => {
        const quote = await prisma.vendorQuote.findFirst({
            where: { id: quoteId, rfqId, deletedAt: null },
            include: { status: { select: { name: true } } },
        });
        if (!quote) throw new NotFoundError('Quote not found');

        if (quote.status.name === 'AWARDED') {
            throw new BadRequestError('Cannot delete an AWARDED quote');
        }

        await prisma.$transaction(async (tx) => {
            await tx.quoteLineItem.deleteMany({ where: { quoteId } });
            await tx.vendorQuote.delete({ where: { id: quoteId } });

            // Reset invite
            const invite = await tx.rFQVendorInvite.findFirst({
                where: { rfqId, vendorId: quote.vendorId },
            });
            if (invite) {
                await tx.rFQVendorInvite.update({
                    where: { id: invite.id },
                    data: { hasSubmittedQuote: false, submittedAt: null },
                });
            }
        });
    },

    // --- Workflow (BE-RFQ-05) ---

    publishRFQ: async (rfqId: string, data: PublishRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT RFQs can be published');
        }

        // Validate minimum vendors
        const rfqFull = await prisma.rFQ.findUniqueOrThrow({
            where: { id: rfqId },
            select: { minimumVendors: true, bidDeadline: true },
        });

        if (data.vendorIds.length < rfqFull.minimumVendors) {
            throw new BadRequestError(`Must invite at least ${rfqFull.minimumVendors} vendors`);
        }

        if (rfqFull.bidDeadline <= new Date()) {
            throw new BadRequestError('Bid deadline must be in the future');
        }

        // Must have at least 1 deliverable
        const deliverableCount = await prisma.rFQDeliverable.count({ where: { rfqId } });
        if (deliverableCount === 0) {
            throw new BadRequestError('RFQ must have at least one deliverable');
        }

        // Validate all vendor IDs
        const vendors = await prisma.vendor.findMany({
            where: { id: { in: data.vendorIds }, deletedAt: null },
        });
        if (vendors.length !== data.vendorIds.length) {
            throw new NotFoundError('One or more vendors not found or inactive');
        }

        const publishedStatus = await getRFQStatusByName('PUBLISHED');

        return await prisma.$transaction(async (tx) => {
            await tx.rFQ.update({
                where: { id: rfqId },
                data: {
                    statusId: publishedStatus.id,
                    publishedBy: userId,
                    publishedAt: new Date(),
                },
            });

            // Create invites
            for (const vendorId of data.vendorIds) {
                await tx.rFQVendorInvite.create({
                    data: {
                        id: ulid(),
                        rfqId,
                        vendorId,
                        invitedBy: userId,
                        inviteEmailSentAt: new Date(),
                        inviteEmailStatus: 'SENT',
                    },
                });
                console.log(`Send RFQ invitation email to vendor ${vendorId}`);
            }

            return await tx.rFQ.findUniqueOrThrow({
                where: { id: rfqId },
                include: rfqDetailInclude,
            });
        });
    },

    cancelRFQ: async (rfqId: string, data: CancelRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);

        if (rfq.status.name === 'AWARDED') {
            throw new BadRequestError('Cannot cancel an awarded RFQ. Use void-award instead.');
        }
        if (rfq.status.name === 'CANCELLED' || rfq.status.name === 'VOID') {
            throw new BadRequestError(`RFQ is already ${rfq.status.name}`);
        }

        const cancelledStatus = await getRFQStatusByName('CANCELLED');

        console.log('Send cancellation email to all invited vendors');

        return await prisma.rFQ.update({
            where: { id: rfqId },
            data: {
                statusId: cancelledStatus.id,
                cancelledBy: userId,
                cancelledAt: new Date(),
                cancellationReason: data.cancellationReason,
            },
            include: rfqDetailInclude,
        });
    },

    awardRFQ: async (rfqId: string, data: AwardRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);

        const allowedStatuses = ['PUBLISHED', 'EVALUATION', 'AWARDED'];
        if (!allowedStatuses.includes(rfq.status.name)) {
            throw new BadRequestError('RFQ must be PUBLISHED, EVALUATION, or AWARDED to award');
        }

        // Verify quote
        const quote = await prisma.vendorQuote.findFirst({
            where: { id: data.awardedQuoteId, rfqId, deletedAt: null },
            include: { status: { select: { name: true } } },
        });
        if (!quote) throw new NotFoundError('Quote not found');
        if (quote.isAwarded) {
            throw new BadRequestError('This quote is already awarded');
        }
        if (quote.vendorId !== data.awardedVendorId) {
            throw new BadRequestError('awardedVendorId does not match the quote vendor');
        }

        const awardedStatus = await getRFQStatusByName('AWARDED');
        const awardedQuoteStatus = await getQuoteStatusByName('AWARDED');
        const notAwardedQuoteStatus = await getQuoteStatusByName('NOT_AWARDED');

        return await prisma.$transaction(async (tx) => {
            // Update RFQ status + set latest awarded vendor
            await tx.rFQ.update({
                where: { id: rfqId },
                data: {
                    statusId: awardedStatus.id,
                    awardedBy: userId,
                    awardedAt: new Date(),
                    awardedVendorId: data.awardedVendorId,
                    awardedAmount: data.awardedAmount,
                },
            });

            // Mark winning quote as AWARDED
            await tx.vendorQuote.update({
                where: { id: data.awardedQuoteId },
                data: { isAwarded: true, statusId: awardedQuoteStatus.id },
            });

            // Mark remaining non-awarded quotes as NOT_AWARDED
            await tx.vendorQuote.updateMany({
                where: { rfqId, isAwarded: false, deletedAt: null },
                data: { statusId: notAwardedQuoteStatus.id },
            });

            return await tx.rFQ.findUniqueOrThrow({
                where: { id: rfqId },
                include: rfqDetailInclude,
            });
        });
    },

    voidAward: async (rfqId: string, data: VoidAwardRequest) => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                status: { select: { name: true } },
            },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        if (rfq.status.name !== 'AWARDED') {
            throw new BadRequestError('Only AWARDED RFQs can be voided');
        }

        const voidStatus = await getRFQStatusByName('VOID');
        const submittedQuoteStatus = await getQuoteStatusByName('SUBMITTED');

        return await prisma.$transaction(async (tx) => {
            await tx.rFQ.update({
                where: { id: rfqId },
                data: {
                    statusId: voidStatus.id,
                    awardedVendorId: null,
                    awardedAmount: null,
                    awardedBy: null,
                    awardedAt: null,
                },
            });

            // Revert all quotes back to SUBMITTED
            await tx.vendorQuote.updateMany({
                where: { rfqId, deletedAt: null },
                data: { isAwarded: false, statusId: submittedQuoteStatus.id },
            });

            return await tx.rFQ.findUniqueOrThrow({
                where: { id: rfqId },
                include: rfqDetailInclude,
            });
        });
    },

    unawardRFQ: async (rfqId: string) => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                status: { select: { name: true } },
            },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        if (rfq.status.name === 'CANCELLED' || rfq.status.name === 'VOID') {
            throw new BadRequestError('Cannot unaward a cancelled or voided RFQ');
        }

        const evaluationStatus = await getRFQStatusByName('EVALUATION');
        const submittedQuoteStatus = await getQuoteStatusByName('SUBMITTED');

        return await prisma.$transaction(async (tx) => {
            await tx.rFQ.update({
                where: { id: rfqId },
                data: {
                    statusId: evaluationStatus.id,
                    awardedVendorId: null,
                    awardedAmount: null,
                    awardedBy: null,
                    awardedAt: null,
                },
            });

            await tx.vendorQuote.updateMany({
                where: { rfqId, deletedAt: null },
                data: { isAwarded: false, statusId: submittedQuoteStatus.id },
            });

            return await tx.rFQ.findUniqueOrThrow({
                where: { id: rfqId },
                include: rfqDetailInclude,
            });
        });
    },

    // --- Addendums (BE-RFQ-06) ---

    createAddendum: async (rfqId: string, data: AddendumCreateRequest, userId: string) => {
        const rfq = await getRFQOrThrow(rfqId);
        if (rfq.status.name !== 'PUBLISHED' && rfq.status.name !== 'EVALUATION') {
            throw new BadRequestError(
                'Can only create addendums for published or in-evaluation RFQs'
            );
        }

        if (data.impactsDeadline && !data.newBidDeadline) {
            throw new BadRequestError('newBidDeadline is required when impactsDeadline is true');
        }
        if (data.newBidDeadline && data.newBidDeadline <= new Date()) {
            throw new BadRequestError('New bid deadline must be in the future');
        }

        // Validate change type
        const changeType = await prisma.addendumChangeType.findUnique({
            where: { id: data.changeTypeId },
        });
        if (!changeType) throw new NotFoundError('Addendum change type not found');

        // Auto-assign addendumNumber
        const maxNum = await prisma.rFQAddendum.aggregate({
            where: { rfqId },
            _max: { addendumNumber: true },
        });

        return await prisma.$transaction(async (tx) => {
            const addendum = await tx.rFQAddendum.create({
                data: {
                    id: ulid(),
                    rfqId,
                    addendumNumber: (maxNum._max.addendumNumber || 0) + 1,
                    title: data.title,
                    description: data.description,
                    changeTypeId: data.changeTypeId,
                    changesDescription: data.changesDescription,
                    impactsDeadline: data.impactsDeadline || false,
                    newBidDeadline: data.newBidDeadline,
                    impactsScope: data.impactsScope || false,
                    impactsPricing: data.impactsPricing || false,
                    issuedBy: userId,
                    requiresAcknowledgment: data.requiresAcknowledgment || false,
                },
                include: {
                    changeType: { select: { id: true, name: true, code: true, color: true } },
                },
            });

            // Update RFQ bid deadline if impacts deadline
            if (data.impactsDeadline && data.newBidDeadline) {
                await tx.rFQ.update({
                    where: { id: rfqId },
                    data: { bidDeadline: data.newBidDeadline },
                });
            }

            console.log('Send addendum notification to all invited vendors');

            return addendum;
        });
    },

    listAddendums: async (rfqId: string) => {
        await getRFQOrThrow(rfqId);
        return await prisma.rFQAddendum.findMany({
            where: { rfqId },
            orderBy: { addendumNumber: 'asc' },
            include: { changeType: { select: { id: true, name: true, code: true, color: true } } },
        });
    },

    // --- Bid Comparison (BE-RFQ-07) ---

    getBidComparison: async (rfqId: string) => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                status: statusSelect,
                deliverables: {
                    orderBy: { sequenceNumber: 'asc' },
                },
                quotes: {
                    where: {
                        deletedAt: null,
                        status: { name: { in: ['SUBMITTED', 'AWARDED'] } },
                    },
                    include: {
                        vendor: { select: { id: true, name: true } },
                        status: statusSelect,
                        lineItems: {
                            include: {
                                deliverable: { select: { sequenceNumber: true } },
                            },
                        },
                    },
                    orderBy: { grandTotal: 'asc' },
                },
                invites: true,
            },
        });

        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const quotes = rfq.quotes.map((q) => ({
            quoteId: q.id,
            vendorId: q.vendorId,
            vendorName: q.vendor.name,
            status: q.status,
            totalAmount: q.totalAmount,
            taxAmount: q.taxAmount,
            grandTotal: q.grandTotal,
            leadTimeDays: q.leadTimeDays,
            warrantyPeriod: q.warrantyPeriod,
            isResponsive: q.isResponsive,
            lineItems: q.lineItems
                .sort(
                    (a, b) =>
                        (a.deliverable?.sequenceNumber || 0) - (b.deliverable?.sequenceNumber || 0)
                )
                .map((li) => ({
                    deliverableId: li.deliverableId,
                    sequenceNumber: li.deliverable?.sequenceNumber,
                    unitPrice: li.unitPrice,
                    quantity: li.quantity,
                    lineTotal: li.lineTotal,
                    notes: li.notes,
                    alternateProposed: li.alternateProposed,
                })),
        }));

        // Statistics
        const grandTotals = quotes.map((q) => Number(q.grandTotal));
        const sorted = [...grandTotals].sort((a, b) => a - b);

        const lowestQuote = sorted.length > 0 ? sorted[0] : null;
        const highestQuote = sorted.length > 0 ? sorted[sorted.length - 1] : null;
        const averageQuote =
            sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null;
        const medianQuote =
            sorted.length > 0
                ? sorted.length % 2 === 0
                    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                    : sorted[Math.floor(sorted.length / 2)]
                : null;

        const declined = rfq.invites.filter((i) => i.declinedToQuote).length;
        const quotesExpected = rfq.invites.length - declined;
        const budgetVariance =
            lowestQuote != null && rfq.estimatedBudget
                ? lowestQuote - Number(rfq.estimatedBudget)
                : null;

        return {
            rfq: {
                rfqNumber: rfq.rfqNumber,
                title: rfq.title,
                estimatedBudget: rfq.estimatedBudget,
                bidDeadline: rfq.bidDeadline,
                status: rfq.status,
            },
            deliverables: rfq.deliverables.map((d) => ({
                id: d.id,
                sequenceNumber: d.sequenceNumber,
                description: d.description,
                quantity: d.quantity,
                unit: d.unit,
                estimatedUnitPrice: d.estimatedUnitPrice,
                estimatedTotal: d.estimatedTotal,
            })),
            quotes,
            statistics: {
                lowestQuote,
                highestQuote,
                averageQuote,
                medianQuote,
                quotesSubmitted: quotes.length,
                quotesExpected,
                budgetVariance,
            },
        };
    },
};
