import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    CancelRequest,
    GeneratePOFromRFQRequest,
    IssueRequest,
    LineItemCreateRequest,
    LineItemUpdateRequest,
    PaymentCreateRequest,
    POCreateRequest,
    POUpdateRequest,
    RecordDeliveryRequest,
} from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const poListSelect = {
    id: true,
    poNumber: true,
    description: true,
    tradeCategory: true,
    total: true,
    totalCommitment: true,
    status: statusSelect,
    issueDate: true,
    expectedDate: true,
    deliveryDate: true,
    vendor: { select: { id: true, name: true } },
    project: { select: { id: true, name: true, jobNumber: true } },
    createdAt: true,
} as const;

const poDetailInclude = {
    project: { select: { id: true, name: true, jobNumber: true } },
    vendor: { select: { id: true, name: true, email: true, phone: true } },
    status: statusSelect,
    lineItems: {
        where: { deletedAt: null },
        orderBy: { lineNumber: 'asc' as const },
    },
    payments: {
        where: { deletedAt: null },
        orderBy: { date: 'desc' as const },
    },
    attachments: {
        include: { document: { select: { id: true, name: true } } },
    },
    purchaseOrderCOs: {
        where: { deletedAt: null },
        select: { id: true, scoNumber: true, amount: true, status: statusSelect },
    },
    invoices: {
        where: { deletedAt: null },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: statusSelect },
    },
} as const;

async function getPOStatusByName(name: string) {
    const status = await prisma.pOStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`PO status '${name}' not configured`);
    return status;
}

async function getPOOrThrow(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { status: { select: { id: true, name: true } } },
    });
    if (!po) throw new NotFoundError('Purchase order not found');
    checkDeletedAt(po);
    return po;
}

function calculatePOFinancials(
    lineItems: { quantity: number; unitPrice: number }[],
    taxPercent: number = 0,
    _retainagePercent: number = 0
) {
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount;
    const totalCommitment = total; // + approved SCOs (future)
    return { subtotal, taxAmount, total, totalCommitment };
}

/**
 * Recalculate PO payment status based on live payment data.
 * Called after payment create/delete and when SCOs modify totalCommitment.
 */
export async function recalculatePOPaymentStatus(poId: string, tx?: TransactionClient) {
    const db = tx || prisma;

    const po = await db.purchaseOrder.findUniqueOrThrow({
        where: { id: poId },
        include: { status: { select: { name: true } } },
    });

    const paymentAgg = await db.pOPayment.aggregate({
        where: { purchaseOrderId: poId, deletedAt: null },
        _sum: { amount: true },
    });

    const paidToDate = Number(paymentAgg._sum.amount || 0);
    const balance = Number(po.totalCommitment) - paidToDate;

    let newStatusName: string | null = null;
    if (balance <= 0 && paidToDate > 0) {
        newStatusName = 'PAID';
    } else if (paidToDate > 0 && balance > 0) {
        newStatusName = 'PARTIALLY_PAID';
    } else if (paidToDate === 0 && po.status.name === 'PARTIALLY_PAID') {
        newStatusName = 'ISSUED';
    }

    if (newStatusName && newStatusName !== po.status.name) {
        const newStatus = await db.pOStatus.findFirst({ where: { name: newStatusName } });
        if (newStatus) {
            await db.purchaseOrder.update({
                where: { id: poId },
                data: { statusId: newStatus.id },
            });
        }
    }

    return { paidToDate, balance };
}

export const POService = {
    // --- CRUD (BE-PO-02) ---

    listPOs: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            projectId,
            status,
            tradeCategory,
            vendorId,
            startDate,
            endDate,
            overdue,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        if (!projectId) {
            throw new BadRequestError('projectId query parameter is required');
        }

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            projectId,
            ...restFilter,
            ...(status && { status: { name: status } }),
            ...(tradeCategory && { tradeCategory }),
            ...(vendorId && { vendorId }),
        };

        const andConditions: unknown[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { poNumber: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { vendor: { name: { contains: search, mode: 'insensitive' as const } } },
                ],
            });
        }

        if (startDate) {
            andConditions.push({ issueDate: { gte: new Date(startDate as string) } });
        }
        if (endDate) {
            andConditions.push({ issueDate: { lte: new Date(endDate as string) } });
        }

        if (overdue === 'true') {
            andConditions.push({
                status: { name: 'ISSUED' },
                expectedDate: { lt: new Date() },
                deliveryDate: null,
            });
        }

        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrder.count({ where: whereClause }),
            prisma.purchaseOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: poListSelect,
            }),
        ]);

        // Add computed isOverdue
        const enriched = data.map((po) => ({
            ...po,
            isOverdue:
                po.status.name === 'ISSUED' &&
                po.expectedDate != null &&
                po.expectedDate < new Date() &&
                po.deliveryDate == null,
        }));

        return { data: enriched, count };
    },

    createPO: async (data: POCreateRequest, userId: string) => {
        const { lineItems, ...poData } = data;

        // Validate project
        const project = await prisma.project.findUnique({
            where: { id: poData.projectId },
            select: { id: true, jobNumber: true, deletedAt: true },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        // Validate vendor
        const vendor = await prisma.vendor.findUnique({ where: { id: poData.vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        // Validate cost codes on line items
        for (const li of lineItems) {
            if (li.costCodeId) {
                const costCode = await prisma.costCode.findUnique({
                    where: { id: li.costCodeId },
                });
                if (!costCode) throw new BadRequestError('Invalid cost code');
                checkDeletedAt(costCode);
            }
        }

        // Get DRAFT status
        const draftStatus = await getPOStatusByName('DRAFT');

        return await prisma.$transaction(async (tx) => {
            // Auto-generate poNumber
            const jobNumber = project.jobNumber || 'UNKNOWN';
            const latestPO = await tx.purchaseOrder.findFirst({
                where: { projectId: poData.projectId },
                orderBy: { poNumber: 'desc' },
                select: { poNumber: true },
            });

            let seq = 1;
            if (latestPO?.poNumber) {
                const parts = latestPO.poNumber.split('-');
                seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
            }
            const poNumber = `PO-${jobNumber}-${String(seq).padStart(3, '0')}`;

            // Calculate financials
            const taxPercent = poData.taxPercent ?? 0;
            const retainagePercent = poData.retainagePercent ?? 0;
            const financials = calculatePOFinancials(lineItems, taxPercent, retainagePercent);

            // Auto-populate contact from vendor if not provided
            const contactName = poData.contactName || vendor.name;
            const contactEmail = poData.contactEmail || vendor.email;
            const contactPhone = poData.contactPhone || vendor.phone;

            const poId = ulid();

            await tx.purchaseOrder.create({
                data: {
                    id: poId,
                    projectId: poData.projectId,
                    vendorId: poData.vendorId,
                    rfqId: poData.rfqId,
                    poNumber,
                    tradeCategory: poData.tradeCategory,
                    description: poData.description,
                    statusId: draftStatus.id,
                    leadTime: poData.leadTime,
                    shipToAddress: poData.shipToAddress,
                    issueDate: poData.issueDate,
                    expectedDate: poData.expectedDate,
                    subtotal: financials.subtotal,
                    taxPercent,
                    taxAmount: financials.taxAmount,
                    total: financials.total,
                    totalCommitment: financials.totalCommitment,
                    retainagePercent,
                    paymentTerms: poData.paymentTerms,
                    notes: poData.notes,
                    vendorNotes: poData.vendorNotes,
                    createdBy: userId,
                },
            });

            // Create line items
            for (let i = 0; i < lineItems.length; i++) {
                const li = lineItems[i];
                await tx.purchaseOrderLineItem.create({
                    data: {
                        id: ulid(),
                        purchaseOrderId: poId,
                        lineNumber: i + 1,
                        description: li.description,
                        quantity: li.quantity,
                        unit: li.unit,
                        unitPrice: li.unitPrice,
                        amount: li.quantity * li.unitPrice,
                        costCodeId: li.costCodeId,
                        notes: li.notes,
                    },
                });
            }

            return await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: poId },
                include: poDetailInclude,
            });
        });
    },

    getPO: async (id: string) => {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: poDetailInclude,
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        // Compute paidToDate, balance, isOverdue
        const paidToDate = po.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = Number(po.totalCommitment) - paidToDate;
        const isOverdue =
            po.status.name === 'ISSUED' &&
            po.expectedDate != null &&
            po.expectedDate < new Date() &&
            po.deliveryDate == null;

        return { ...po, paidToDate, balance, isOverdue };
    },

    updatePO: async (id: string, data: POUpdateRequest) => {
        const po = await getPOOrThrow(id);

        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Cannot edit a PO that is not in DRAFT status');
        }

        const updateData: Record<string, unknown> = { ...data };

        // If taxPercent changed, recalculate financials
        if (data.taxPercent !== undefined) {
            const lineItems = await prisma.purchaseOrderLineItem.findMany({
                where: { purchaseOrderId: id, deletedAt: null },
            });
            const items = lineItems.map((li) => ({
                quantity: Number(li.quantity),
                unitPrice: Number(li.unitPrice),
            }));
            const financials = calculatePOFinancials(
                items,
                data.taxPercent ?? 0,
                data.retainagePercent ?? Number(po.retainagePercent || 0)
            );
            updateData.subtotal = financials.subtotal;
            updateData.taxAmount = financials.taxAmount;
            updateData.total = financials.total;
            updateData.totalCommitment = financials.totalCommitment;
        }

        return await prisma.purchaseOrder.update({
            where: { id },
            data: updateData,
            include: poDetailInclude,
        });
    },

    deletePO: async (id: string) => {
        const po = await getPOOrThrow(id);

        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Cannot delete a PO that is not in DRAFT status');
        }

        const now = new Date();
        await prisma.$transaction([
            prisma.purchaseOrderLineItem.updateMany({
                where: { purchaseOrderId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.purchaseOrder.update({
                where: { id },
                data: { deletedAt: now },
            }),
        ]);
    },

    // --- Line Items (BE-PO-03) ---

    addLineItem: async (poId: string, data: LineItemCreateRequest) => {
        const po = await getPOOrThrow(poId);
        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only add line items to DRAFT POs');
        }

        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(costCode);
        }

        return await prisma.$transaction(async (tx) => {
            // Get max lineNumber
            const maxLine = await tx.purchaseOrderLineItem.aggregate({
                where: { purchaseOrderId: poId, deletedAt: null },
                _max: { lineNumber: true },
            });

            const lineItem = await tx.purchaseOrderLineItem.create({
                data: {
                    id: ulid(),
                    purchaseOrderId: poId,
                    lineNumber: (maxLine._max.lineNumber || 0) + 1,
                    description: data.description,
                    quantity: data.quantity,
                    unit: data.unit,
                    unitPrice: data.unitPrice,
                    amount: data.quantity * data.unitPrice,
                    costCodeId: data.costCodeId,
                    notes: data.notes,
                },
            });

            // Recalculate PO financials
            await recalcPOFinancials(poId, tx);

            return lineItem;
        });
    },

    updateLineItem: async (poId: string, lineItemId: string, data: LineItemUpdateRequest) => {
        const po = await getPOOrThrow(poId);
        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only update line items on DRAFT POs');
        }

        const lineItem = await prisma.purchaseOrderLineItem.findFirst({
            where: { id: lineItemId, purchaseOrderId: poId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(costCode);
        }

        return await prisma.$transaction(async (tx) => {
            const qty = data.quantity ?? Number(lineItem.quantity);
            const price = data.unitPrice ?? Number(lineItem.unitPrice);
            const amount = qty * price;

            const updated = await tx.purchaseOrderLineItem.update({
                where: { id: lineItemId },
                data: { ...data, amount },
            });

            await recalcPOFinancials(poId, tx);

            return updated;
        });
    },

    removeLineItem: async (poId: string, lineItemId: string) => {
        const po = await getPOOrThrow(poId);
        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only remove line items from DRAFT POs');
        }

        const lineItem = await prisma.purchaseOrderLineItem.findFirst({
            where: { id: lineItemId, purchaseOrderId: poId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        const count = await prisma.purchaseOrderLineItem.count({
            where: { purchaseOrderId: poId, deletedAt: null },
        });
        if (count <= 1) {
            throw new BadRequestError('PO must have at least one line item');
        }

        await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderLineItem.delete({ where: { id: lineItemId } });
            await recalcPOFinancials(poId, tx);
        });
    },

    // --- Workflow (BE-PO-04) ---

    issuePO: async (id: string, data: IssueRequest, userId: string) => {
        const po = await getPOOrThrow(id);

        if (po.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT POs can be issued');
        }

        // Must have at least 1 line item
        const lineItemCount = await prisma.purchaseOrderLineItem.count({
            where: { purchaseOrderId: id, deletedAt: null },
        });
        if (lineItemCount === 0) {
            throw new BadRequestError('PO must have at least one line item');
        }

        // Total > 0
        if (Number(po.total) <= 0) {
            throw new BadRequestError('PO total must be greater than zero');
        }

        // Budget warning (non-blocking)
        let budgetWarning = null;
        const project = await prisma.project.findUniqueOrThrow({
            where: { id: po.projectId },
            include: { primeContract: { select: { contractValue: true } } },
        });

        if (project.primeContract) {
            const budgetLimit = Number(project.primeContract.contractValue);

            // Sum all non-cancelled, non-deleted PO totals for this project
            const expenseAgg = await prisma.purchaseOrder.aggregate({
                where: {
                    projectId: po.projectId,
                    deletedAt: null,
                    id: { not: id },
                    status: { name: { not: 'CANCELLED' } },
                },
                _sum: { totalCommitment: true },
            });
            const currentExpenses = Number(expenseAgg._sum.totalCommitment || 0);
            const thisAmount = Number(po.totalCommitment);
            const newTotal = currentExpenses + thisAmount;

            if (newTotal > budgetLimit) {
                budgetWarning = {
                    budgetLimit,
                    currentExpenses,
                    thisAmount,
                    newTotal,
                    overage: newTotal - budgetLimit,
                };
            }
        }

        const issuedStatus = await getPOStatusByName('ISSUED');

        const updatedPO = await prisma.$transaction(async (tx) => {
            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    statusId: issuedStatus.id,
                    issuedBy: userId,
                    issuedAt: new Date(),
                },
            });

            return await tx.purchaseOrder.findUniqueOrThrow({
                where: { id },
                include: poDetailInclude,
            });
        });

        if (data.emailVendor) {
            console.log(`Email PO to vendor ${po.vendorId}`);
        }

        return { ...updatedPO, budgetWarning };
    },

    cancelPO: async (id: string, data: CancelRequest, userId: string) => {
        const po = await getPOOrThrow(id);

        if (po.status.name === 'CANCELLED') {
            throw new BadRequestError('PO is already cancelled');
        }

        // Check downstream impacts
        const paymentCount = await prisma.pOPayment.count({
            where: { purchaseOrderId: id, deletedAt: null },
        });
        if (paymentCount > 0 && !data.confirmPayments) {
            throw new BadRequestError('PO has payments. Set confirmPayments=true to proceed');
        }

        const invoiceCount = await prisma.invoice.count({
            where: { purchaseOrderId: id, deletedAt: null },
        });
        if (invoiceCount > 0 && !data.confirmInvoices) {
            throw new BadRequestError(
                'PO has linked invoices. Set confirmInvoices=true to proceed'
            );
        }

        const approvedSCOCount = await prisma.purchaseOrderCO.count({
            where: {
                purchaseOrderId: id,
                deletedAt: null,
                status: { name: { in: ['APPROVED', 'EXECUTED'] } },
            },
        });
        if (approvedSCOCount > 0 && !data.confirmSCOs) {
            throw new BadRequestError(
                'PO has approved change orders. Set confirmSCOs=true to proceed'
            );
        }

        const cancelledStatus = await getPOStatusByName('CANCELLED');

        const updatedPO = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                statusId: cancelledStatus.id,
                cancelledBy: userId,
                cancelledAt: new Date(),
                cancellationReason: data.reason,
            },
            include: poDetailInclude,
        });

        if (data.notifyVendor) {
            console.log('Send cancellation email to vendor');
        }

        return updatedPO;
    },

    recordDelivery: async (id: string, data: RecordDeliveryRequest) => {
        const po = await getPOOrThrow(id);

        if (po.status.name !== 'ISSUED' && po.status.name !== 'PARTIALLY_PAID') {
            throw new BadRequestError('Can only record delivery on ISSUED or PARTIALLY_PAID POs');
        }

        return await prisma.purchaseOrder.update({
            where: { id },
            data: { deliveryDate: data.deliveryDate },
            include: poDetailInclude,
        });
    },

    // --- Payments (BE-PO-05) ---

    createPayment: async (poId: string, data: PaymentCreateRequest, userId: string) => {
        const po = await getPOOrThrow(poId);

        if (po.status.name !== 'ISSUED' && po.status.name !== 'PARTIALLY_PAID') {
            throw new BadRequestError(
                `Cannot record payment on a PO with status ${po.status.name}`
            );
        }

        // Validate invoiceId if provided
        if (data.invoiceId) {
            const invoice = await prisma.invoice.findFirst({
                where: { id: data.invoiceId, purchaseOrderId: poId, deletedAt: null },
            });
            if (!invoice) throw new NotFoundError('Invoice not found for this PO');
        }

        return await prisma.$transaction(async (tx) => {
            const payment = await tx.pOPayment.create({
                data: {
                    id: ulid(),
                    purchaseOrderId: poId,
                    date: data.date,
                    reference: data.reference,
                    description: data.description,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    invoiceId: data.invoiceId,
                    recordedBy: userId,
                },
            });

            const { paidToDate, balance } = await recalculatePOPaymentStatus(poId, tx);

            // Check for overpayment warning
            let overpaymentWarning = null;
            if (balance < 0) {
                overpaymentWarning = {
                    totalCommitment: Number(po.totalCommitment),
                    paidToDate,
                    overpayment: Math.abs(balance),
                };
            }

            const updatedPO = await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: poId },
                include: poDetailInclude,
            });

            return {
                payment,
                po: { ...updatedPO, paidToDate, balance },
                overpaymentWarning,
            };
        });
    },

    listPayments: async (poId: string) => {
        const po = await getPOOrThrow(poId);

        const payments = await prisma.pOPayment.findMany({
            where: { purchaseOrderId: poId, deletedAt: null },
            orderBy: { date: 'desc' },
        });

        const paidToDate = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = Number(po.totalCommitment) - paidToDate;

        return {
            payments,
            summary: {
                paidToDate,
                balance,
                totalCommitment: Number(po.totalCommitment),
            },
        };
    },

    deletePayment: async (poId: string, paymentId: string) => {
        const po = await getPOOrThrow(poId);

        const payment = await prisma.pOPayment.findFirst({
            where: { id: paymentId, purchaseOrderId: poId, deletedAt: null },
        });
        if (!payment) throw new NotFoundError('Payment not found');

        await prisma.$transaction(async (tx) => {
            await tx.pOPayment.update({
                where: { id: paymentId },
                data: { deletedAt: new Date() },
            });

            await recalculatePOPaymentStatus(poId, tx);
        });
    },

    // --- RFQ-to-PO Generation (BE-PO-06) ---

    generatePOFromRFQ: async (rfqId: string, data: GeneratePOFromRFQRequest, userId: string) => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                status: { select: { name: true } },
                deliverables: { orderBy: { sequenceNumber: 'asc' } },
            },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        if (rfq.status.name !== 'AWARDED') {
            throw new BadRequestError('Can only generate PO from an awarded RFQ');
        }

        // Check for duplicate generation
        if (rfq.generatedPOId) {
            const existingPO = await prisma.purchaseOrder.findUnique({
                where: { id: rfq.generatedPOId },
            });
            if (existingPO && !existingPO.deletedAt) {
                throw new BadRequestError('PO already generated from this RFQ');
            }
        }

        // Verify vendor invite
        const invite = await prisma.rFQVendorInvite.findUnique({
            where: { id: data.vendorInviteId },
        });
        if (!invite || invite.rfqId !== rfqId) {
            throw new NotFoundError('Vendor invite not found for this RFQ');
        }

        // Fetch awarded quote
        const awardedQuote = await prisma.vendorQuote.findFirst({
            where: { rfqId, vendorId: invite.vendorId, isAwarded: true, deletedAt: null },
            include: { lineItems: true },
        });
        if (!awardedQuote) {
            throw new NotFoundError('Awarded quote not found');
        }

        // Fetch vendor and project
        const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: invite.vendorId } });
        const project = await prisma.project.findUniqueOrThrow({
            where: { id: rfq.projectId },
            select: { id: true, jobNumber: true },
        });

        const draftStatus = await getPOStatusByName('DRAFT');

        // Map vendor type to trade category
        const vendorTypeToTradeCategory: Record<string, string> = {
            MATERIAL: 'MATERIAL',
            FABRICATION: 'FABRICATION',
            INSTALLATION: 'INSTALLATION',
        };
        const tradeCategory = vendorTypeToTradeCategory[vendor.type] || 'MATERIAL';

        return await prisma.$transaction(async (tx) => {
            // Generate PO number
            const jobNumber = project.jobNumber || 'UNKNOWN';
            const latestPO = await tx.purchaseOrder.findFirst({
                where: { projectId: rfq.projectId },
                orderBy: { poNumber: 'desc' },
                select: { poNumber: true },
            });

            let seq = 1;
            if (latestPO?.poNumber) {
                const parts = latestPO.poNumber.split('-');
                seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
            }
            const poNumber = `PO-${jobNumber}-${String(seq).padStart(3, '0')}`;

            // Build line items from quote
            const lineItemsData = awardedQuote.lineItems.map((qli, idx) => {
                // Find matching deliverable for description and costCodeId
                const deliverable = rfq.deliverables.find((d) => d.id === qli.deliverableId);
                return {
                    id: ulid(),
                    lineNumber: idx + 1,
                    description: deliverable?.description || 'From RFQ deliverable',
                    quantity: Number(qli.quantity),
                    unit: qli.unit,
                    unitPrice: Number(qli.unitPrice),
                    amount: Number(qli.lineTotal),
                    costCodeId: deliverable?.costCodeId || null,
                    rfqDeliverableId: qli.deliverableId,
                };
            });

            // Calculate financials
            const taxPercent = data.taxPercent ?? 0;
            const items = lineItemsData.map((li) => ({
                quantity: li.quantity,
                unitPrice: li.unitPrice,
            }));
            const financials = calculatePOFinancials(items, taxPercent);

            const poId = ulid();

            // Contact info from vendor or quote
            const contactName = awardedQuote.submittedBy || vendor.name;
            const contactEmail = awardedQuote.submittedByEmail || vendor.email;
            const contactPhone = awardedQuote.submittedByPhone || vendor.phone;

            // Payment terms from body, vendor, or default
            const paymentTerms = data.paymentTerms || vendor.paymentTerms || 'NET_30';

            // Lead time from quote
            const leadTime = awardedQuote.leadTimeDays
                ? `${awardedQuote.leadTimeDays} days`
                : awardedQuote.leadTime || null;

            await tx.purchaseOrder.create({
                data: {
                    id: poId,
                    projectId: rfq.projectId,
                    vendorId: invite.vendorId,
                    rfqId,
                    poNumber,
                    tradeCategory: tradeCategory as
                        | 'MATERIAL'
                        | 'FABRICATION'
                        | 'INSTALLATION'
                        | 'LABOR'
                        | 'EQUIPMENT',
                    description: rfq.title,
                    statusId: draftStatus.id,
                    leadTime: leadTime,
                    shipToAddress: data.shipToAddress,
                    subtotal: financials.subtotal,
                    taxPercent,
                    taxAmount: financials.taxAmount,
                    total: financials.total,
                    totalCommitment: financials.totalCommitment,
                    paymentTerms,
                    notes: data.notes,
                    awardedRFQVendorInviteId: data.vendorInviteId,
                    awardedQuoteId: awardedQuote.id,
                    createdBy: userId,
                },
            });

            // Create line items
            for (const li of lineItemsData) {
                await tx.purchaseOrderLineItem.create({
                    data: {
                        id: li.id,
                        purchaseOrderId: poId,
                        lineNumber: li.lineNumber,
                        description: li.description,
                        quantity: li.quantity,
                        unit: li.unit,
                        unitPrice: li.unitPrice,
                        amount: li.amount,
                        costCodeId: li.costCodeId,
                        rfqDeliverableId: li.rfqDeliverableId,
                    },
                });
            }

            // Link PO to RFQ
            await tx.rFQ.update({
                where: { id: rfqId },
                data: { generatedPOId: poId },
            });

            return await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: poId },
                include: poDetailInclude,
            });
        });
    },

    // --- Summary (BE-PO-07) ---

    getProjectPOSummary: async (projectId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const allPOs = await prisma.purchaseOrder.findMany({
            where: { projectId, deletedAt: null },
            include: {
                status: { select: { name: true } },
                payments: { where: { deletedAt: null }, select: { amount: true } },
            },
        });

        const statusBreakdown: Record<string, { count: number; totalAmount: number }> = {
            draft: { count: 0, totalAmount: 0 },
            issued: { count: 0, totalAmount: 0 },
            partiallyPaid: { count: 0, totalAmount: 0 },
            paid: { count: 0, totalAmount: 0 },
            cancelled: { count: 0, totalAmount: 0 },
        };

        const statusNameToKey: Record<string, string> = {
            DRAFT: 'draft',
            ISSUED: 'issued',
            PARTIALLY_PAID: 'partiallyPaid',
            PAID: 'paid',
            CANCELLED: 'cancelled',
        };

        const tradeCategoryBreakdown: Record<string, { count: number; totalAmount: number }> = {
            material: { count: 0, totalAmount: 0 },
            fabrication: { count: 0, totalAmount: 0 },
            installation: { count: 0, totalAmount: 0 },
            labor: { count: 0, totalAmount: 0 },
            equipment: { count: 0, totalAmount: 0 },
        };

        const tradeCategoryToKey: Record<string, string> = {
            MATERIAL: 'material',
            FABRICATION: 'fabrication',
            INSTALLATION: 'installation',
            LABOR: 'labor',
            EQUIPMENT: 'equipment',
        };

        let totalCommitted = 0;
        let totalPaid = 0;
        let overdueCount = 0;

        for (const po of allPOs) {
            const statusKey = statusNameToKey[po.status.name];
            if (statusKey) {
                statusBreakdown[statusKey].count++;
                statusBreakdown[statusKey].totalAmount += Number(po.totalCommitment);
            }

            const tradeKey = tradeCategoryToKey[po.tradeCategory];
            if (tradeKey) {
                tradeCategoryBreakdown[tradeKey].count++;
                tradeCategoryBreakdown[tradeKey].totalAmount += Number(po.totalCommitment);
            }

            if (po.status.name !== 'CANCELLED') {
                totalCommitted += Number(po.totalCommitment);
            }

            const poPaid = po.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            totalPaid += poPaid;

            if (
                po.status.name === 'ISSUED' &&
                po.expectedDate != null &&
                po.expectedDate < new Date() &&
                po.deliveryDate == null
            ) {
                overdueCount++;
            }
        }

        return {
            totalCount: allPOs.length,
            totalCommitted,
            totalPaid,
            totalBalance: totalCommitted - totalPaid,
            byStatus: statusBreakdown,
            byTradeCategory: tradeCategoryBreakdown,
            overdueCount,
        };
    },

    getVendorPOHistory: async (vendorId: string, params: PaginationParams) => {
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        const { filter, skip, take, sortBy, sortOrder } = params;
        const { status, projectId } = filter || {};

        const whereClause: Record<string, unknown> = {
            vendorId,
            deletedAt: null,
            ...(status && { status: { name: status } }),
            ...(projectId && { projectId }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrder.count({ where: whereClause }),
            prisma.purchaseOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    ...poListSelect,
                    payments: {
                        where: { deletedAt: null },
                        select: { amount: true },
                    },
                },
            }),
        ]);

        // Compute paidToDate and balance per PO
        const enriched = data.map((po) => {
            const paidToDate = po.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(po.totalCommitment) - paidToDate;
            const { payments: _, ...rest } = po;
            return { ...rest, paidToDate, balance };
        });

        // Summary header
        let totalCommitted = 0;
        let totalPaid = 0;
        for (const po of enriched) {
            totalCommitted += Number(po.totalCommitment);
            totalPaid += po.paidToDate;
        }

        return {
            data: enriched,
            count,
            summary: {
                totalPOs: count,
                totalCommitted,
                totalPaid,
                totalOutstanding: totalCommitted - totalPaid,
            },
        };
    },
};

/**
 * Recalculate PO financial fields from current line items.
 */
async function recalcPOFinancials(poId: string, tx: TransactionClient) {
    const lineItems = await tx.purchaseOrderLineItem.findMany({
        where: { purchaseOrderId: poId, deletedAt: null },
    });

    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    const items = lineItems.map((li) => ({
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
    }));
    const financials = calculatePOFinancials(
        items,
        Number(po.taxPercent || 0),
        Number(po.retainagePercent || 0)
    );

    await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
            subtotal: financials.subtotal,
            taxAmount: financials.taxAmount,
            total: financials.total,
            totalCommitment: financials.totalCommitment,
        },
    });
}
