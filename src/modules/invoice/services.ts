import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    DisputeRequest,
    InvoiceCreateRequest,
    InvoiceLineItemCreateRequest,
    InvoiceLineItemUpdateRequest,
    InvoiceRejectRequest,
    InvoiceUpdateRequest,
    MarkPaidRequest,
    ResolveDisputeRequest,
} from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const invoiceListSelect = {
    id: true,
    invoiceNumber: true,
    invoiceDate: true,
    dueDate: true,
    totalAmount: true,
    invoiceType: true,
    status: statusSelect,
    isPaid: true,
    isDisputed: true,
    paidAmount: true,
    retainageAmount: true,
    retainagePercent: true,
    vendor: { select: { id: true, name: true } },
    purchaseOrder: { select: { id: true, poNumber: true } },
    createdAt: true,
} as const;

const invoiceDetailInclude = {
    purchaseOrder: {
        select: {
            id: true,
            poNumber: true,
            total: true,
            totalCommitment: true,
            status: statusSelect,
            retainagePercent: true,
            paymentTerms: true,
        },
    },
    project: { select: { id: true, name: true, jobNumber: true } },
    vendor: { select: { id: true, name: true, email: true, phone: true } },
    status: statusSelect,
    invoiceDocument: { select: { id: true, name: true } },
    lineItems: { orderBy: { createdAt: 'asc' as const } },
    attachments: {
        include: { document: { select: { id: true, name: true } } },
    },
} as const;

// --- Helpers ---

function calculateAging(dueDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const isPastDue = today > due;

    let agingBucket: string;
    if (daysOverdue <= 0) agingBucket = 'CURRENT';
    else if (daysOverdue <= 30) agingBucket = 'CURRENT';
    else if (daysOverdue <= 60) agingBucket = 'DAYS_30_60';
    else if (daysOverdue <= 90) agingBucket = 'DAYS_60_90';
    else agingBucket = 'DAYS_90_PLUS';

    return { daysOverdue, isPastDue, agingBucket };
}

function calculateRetainage(totalAmount: number, retainagePercent: number) {
    const retainageAmount = totalAmount * (retainagePercent / 100);
    const netPaymentAmount = totalAmount - retainageAmount;
    return { retainageAmount, netPaymentAmount };
}

const PAYMENT_TERM_DAYS: Record<string, number> = {
    DUE_ON_RECEIPT: 0,
    NET_15: 15,
    NET_30: 30,
    NET_45: 45,
    NET_60: 60,
    NET_90: 90,
};

function calculateDueDate(invoiceDate: Date, paymentTerms: string | null): Date {
    const days = paymentTerms ? (PAYMENT_TERM_DAYS[paymentTerms] ?? 30) : 30;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
}

async function getStatusByName(name: string) {
    const status = await prisma.invoiceStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`Invoice status '${name}' not configured`);
    return status;
}

async function getInvoiceOrThrow(id: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { status: { select: { id: true, name: true } } },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    checkDeletedAt(invoice);
    return invoice;
}

function enrichWithAging<
    T extends { dueDate: Date; isPaid: boolean; totalAmount: unknown; retainagePercent: unknown },
>(invoice: T) {
    const aging = invoice.isPaid
        ? { daysOverdue: 0, isPastDue: false, agingBucket: 'CURRENT' }
        : calculateAging(invoice.dueDate);
    const { retainageAmount, netPaymentAmount } = calculateRetainage(
        Number(invoice.totalAmount),
        Number(invoice.retainagePercent || 0)
    );
    return { ...invoice, ...aging, retainageAmount, netPaymentAmount };
}

export const InvoiceService = {
    // --- CRUD (BE-INV-02) ---

    listInvoices: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            projectId,
            status,
            vendorId,
            poId,
            invoiceType,
            category,
            startDate,
            endDate,
            isPaid,
            isDisputed,
            isOverdue,
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
            ...(vendorId && { vendorId }),
            ...(poId && { purchaseOrderId: poId }),
            ...(invoiceType && { invoiceType }),
            ...(category && { category }),
            ...(isPaid !== undefined && { isPaid: isPaid === 'true' }),
            ...(isDisputed !== undefined && { isDisputed: isDisputed === 'true' }),
        };

        const andConditions: unknown[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
                    { vendor: { name: { contains: search, mode: 'insensitive' as const } } },
                ],
            });
        }

        if (startDate) {
            andConditions.push({ invoiceDate: { gte: new Date(startDate as string) } });
        }
        if (endDate) {
            andConditions.push({ invoiceDate: { lte: new Date(endDate as string) } });
        }

        if (isOverdue === 'true') {
            andConditions.push({
                isPaid: false,
                dueDate: { lt: new Date() },
            });
        }

        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.invoice.count({ where: whereClause }),
            prisma.invoice.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: invoiceListSelect,
            }),
        ]);

        const enriched = data.map((inv) => enrichWithAging(inv as any));
        return { data: enriched, count };
    },

    createInvoice: async (data: InvoiceCreateRequest, userId: string) => {
        const { lineItems, poId, ...invoiceData } = data;

        // Validate PO
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: { status: { select: { name: true } } },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        if (!['ISSUED', 'PARTIALLY_PAID'].includes(po.status.name)) {
            throw new BadRequestError(
                `Cannot create invoice on a PO with status ${po.status.name}`
            );
        }

        // Validate invoice document
        const doc = await prisma.file.findUnique({ where: { id: invoiceData.invoiceDocumentId } });
        if (!doc) throw new NotFoundError('Invoice document not found');
        checkDeletedAt(doc);

        // Duplicate check
        const existing = await prisma.invoice.findFirst({
            where: {
                invoiceNumber: invoiceData.invoiceNumber,
                vendorId: po.vendorId,
                deletedAt: null,
            },
        });
        if (existing) {
            throw new BadRequestError('Duplicate invoice number for this vendor');
        }

        // Validate line items
        if (lineItems?.length) {
            for (const li of lineItems) {
                if (li.costCodeId) {
                    const cc = await prisma.costCode.findUnique({ where: { id: li.costCodeId } });
                    if (!cc) throw new NotFoundError('Cost code not found');
                    checkDeletedAt(cc);
                }
                if (li.poLineItemId) {
                    const poli = await prisma.purchaseOrderLineItem.findFirst({
                        where: { id: li.poLineItemId, purchaseOrderId: poId, deletedAt: null },
                    });
                    if (!poli) throw new BadRequestError('PO line item not found on this PO');
                }
            }
        }

        // Auto-calculate dueDate
        const dueDate =
            invoiceData.dueDate || calculateDueDate(invoiceData.invoiceDate, po.paymentTerms);

        // Auto-set retainage from PO if not provided
        const retainagePercent = invoiceData.retainagePercent ?? Number(po.retainagePercent || 0);
        const { retainageAmount } = calculateRetainage(invoiceData.totalAmount, retainagePercent);

        const poTotal = Number(po.totalCommitment);

        let overageWarning: string | null = null;
        if (invoiceData.totalAmount > poTotal) {
            const overageAmount = invoiceData.totalAmount - poTotal;
            overageWarning = `Invoice exceeds PO total by $${overageAmount.toFixed(2)}`;
        }

        // Get PENDING status
        const pendingStatus = await getStatusByName('PENDING');

        return await prisma.$transaction(async (tx) => {
            const invoiceId = ulid();

            await tx.invoice.create({
                data: {
                    id: invoiceId,
                    purchaseOrderId: poId,
                    projectId: po.projectId,
                    vendorId: po.vendorId,
                    invoiceNumber: invoiceData.invoiceNumber,
                    invoiceDate: invoiceData.invoiceDate,
                    dueDate,
                    totalAmount: invoiceData.totalAmount,
                    invoiceType: invoiceData.invoiceType || 'PRELIMINARY',
                    category: invoiceData.category,
                    notes: invoiceData.notes,
                    invoiceDocumentId: invoiceData.invoiceDocumentId,
                    statusId: pendingStatus.id,
                    createdBy: userId,
                    retainagePercent,
                    retainageAmount,
                    taxAmount: invoiceData.taxAmount,
                    taxRate: invoiceData.taxRate,
                    relatedSCOIds: invoiceData.relatedSCOIds || [],
                },
            });

            // Create line items
            if (lineItems?.length) {
                for (const li of lineItems) {
                    await tx.invoiceLineItem.create({
                        data: {
                            id: ulid(),
                            invoiceId,
                            poLineItemId: li.poLineItemId,
                            description: li.description,
                            qty: li.qty,
                            unit: li.unit,
                            unitPrice: li.unitPrice,
                            amount: li.qty * li.unitPrice,
                            costCodeId: li.costCodeId,
                        },
                    });
                }
            }

            const created = await tx.invoice.findUniqueOrThrow({
                where: { id: invoiceId },
                include: invoiceDetailInclude,
            });

            return {
                ...enrichWithAging(created as any),
                overageWarning,
            };
        });
    },

    getInvoice: async (id: string) => {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: invoiceDetailInclude,
        });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);

        const poTotal = Number(invoice.purchaseOrder.total);
        const poTotalCommitment = Number(invoice.purchaseOrder.totalCommitment);

        return {
            ...enrichWithAging(invoice as any),
            poContext: {
                poTotal,
                poTotalCommitment,
            },
        };
    },

    updateInvoice: async (id: string, data: InvoiceUpdateRequest) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.status.name !== 'PENDING' || invoice.isPaid) {
            throw new BadRequestError('Cannot edit an invoice that is not in PENDING status');
        }

        const updateData: Record<string, unknown> = { ...data };

        // Recalculate retainage if totalAmount or retainagePercent changed
        if (data.totalAmount !== undefined || data.retainagePercent !== undefined) {
            const totalAmount = data.totalAmount ?? Number(invoice.totalAmount);
            const retainagePercent = data.retainagePercent ?? Number(invoice.retainagePercent || 0);
            const { retainageAmount } = calculateRetainage(totalAmount, retainagePercent);
            updateData.retainageAmount = retainageAmount;
        }

        return await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: invoiceDetailInclude,
        });
    },

    deleteInvoice: async (id: string) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.status.name !== 'PENDING' || invoice.isPaid) {
            throw new BadRequestError('Cannot delete a non-PENDING invoice');
        }

        await prisma.invoice.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    // --- Line Items (BE-INV-03) ---

    addLineItem: async (invoiceId: string, data: InvoiceLineItemCreateRequest) => {
        const invoice = await getInvoiceOrThrow(invoiceId);
        if (invoice.status.name !== 'PENDING' || invoice.isPaid) {
            throw new BadRequestError('Can only add line items to PENDING invoices');
        }

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new NotFoundError('Cost code not found');
            checkDeletedAt(cc);
        }

        if (data.poLineItemId) {
            const poli = await prisma.purchaseOrderLineItem.findFirst({
                where: {
                    id: data.poLineItemId,
                    purchaseOrderId: invoice.purchaseOrderId,
                    deletedAt: null,
                },
            });
            if (!poli) throw new BadRequestError('PO line item not found on this PO');
        }

        const lineItem = await prisma.invoiceLineItem.create({
            data: {
                id: ulid(),
                invoiceId,
                poLineItemId: data.poLineItemId,
                description: data.description,
                qty: data.qty,
                unit: data.unit,
                unitPrice: data.unitPrice,
                amount: data.qty * data.unitPrice,
                costCodeId: data.costCodeId,
            },
        });

        // Warn if mismatch
        const allItems = await prisma.invoiceLineItem.findMany({
            where: { invoiceId },
        });
        const lineItemsSum = allItems.reduce((sum, li) => sum + Number(li.amount), 0);
        const amountMismatch =
            Math.abs(Number(invoice.totalAmount) - lineItemsSum) > 0.01
                ? `Line items total (${lineItemsSum.toFixed(2)}) differs from invoice total (${Number(invoice.totalAmount).toFixed(2)})`
                : null;

        return { lineItem, amountMismatch };
    },

    updateLineItem: async (
        invoiceId: string,
        lineItemId: string,
        data: InvoiceLineItemUpdateRequest
    ) => {
        const invoice = await getInvoiceOrThrow(invoiceId);
        if (invoice.status.name !== 'PENDING' || invoice.isPaid) {
            throw new BadRequestError('Can only update line items on PENDING invoices');
        }

        const lineItem = await prisma.invoiceLineItem.findFirst({
            where: { id: lineItemId, invoiceId },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new NotFoundError('Cost code not found');
            checkDeletedAt(cc);
        }

        const qty = data.qty ?? Number(lineItem.qty);
        const price = data.unitPrice ?? Number(lineItem.unitPrice);
        const amount = qty * price;

        const updated = await prisma.invoiceLineItem.update({
            where: { id: lineItemId },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.qty !== undefined && { qty: data.qty }),
                ...(data.unit !== undefined && { unit: data.unit }),
                ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
                ...(data.poLineItemId !== undefined && { poLineItemId: data.poLineItemId }),
                ...(data.costCodeId !== undefined && { costCodeId: data.costCodeId }),
                amount,
            },
        });

        // Warn if mismatch
        const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId } });
        const lineItemsSum = allItems.reduce((sum, li) => sum + Number(li.amount), 0);
        const amountMismatch =
            Math.abs(Number(invoice.totalAmount) - lineItemsSum) > 0.01
                ? `Line items total (${lineItemsSum.toFixed(2)}) differs from invoice total (${Number(invoice.totalAmount).toFixed(2)})`
                : null;

        return { lineItem: updated, amountMismatch };
    },

    removeLineItem: async (invoiceId: string, lineItemId: string) => {
        const invoice = await getInvoiceOrThrow(invoiceId);
        if (invoice.status.name !== 'PENDING' || invoice.isPaid) {
            throw new BadRequestError('Can only remove line items from PENDING invoices');
        }

        const lineItem = await prisma.invoiceLineItem.findFirst({
            where: { id: lineItemId, invoiceId },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        await prisma.invoiceLineItem.delete({ where: { id: lineItemId } });
    },

    // --- Workflow (BE-INV-04) ---

    approveInvoice: async (id: string, userId: string) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.status.name !== 'PENDING') {
            throw new BadRequestError('Only PENDING invoices can be approved');
        }

        if (userId === invoice.createdBy) {
            throw new BadRequestError('Creator cannot approve their own invoice');
        }

        const approvedStatus = await getStatusByName('APPROVED');

        return await prisma.invoice.update({
            where: { id },
            data: {
                statusId: approvedStatus.id,
                approvedBy: userId,
                approvedAt: new Date(),
            },
            include: invoiceDetailInclude,
        });
    },

    rejectInvoice: async (id: string, data: InvoiceRejectRequest, userId: string) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.status.name !== 'PENDING') {
            throw new BadRequestError('Only PENDING invoices can be rejected');
        }

        const rejectedStatus = await getStatusByName('REJECTED');

        return await prisma.invoice.update({
            where: { id },
            data: {
                statusId: rejectedStatus.id,
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason: data.reason,
            },
            include: invoiceDetailInclude,
        });
    },

    markPaid: async (id: string, data: MarkPaidRequest, userId: string) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.status.name !== 'APPROVED') {
            throw new BadRequestError('Only APPROVED invoices can be marked as paid');
        }
        if (invoice.isPaid) {
            throw new BadRequestError('Invoice is already paid');
        }
        if (invoice.isDisputed) {
            throw new BadRequestError('Cannot pay a disputed invoice. Resolve dispute first.');
        }

        return await prisma.$transaction(async (tx) => {
            await tx.invoice.update({
                where: { id },
                data: {
                    isPaid: true,
                    paidAmount: data.paidAmount,
                    paidDate: data.paidDate,
                    paymentReference: data.paymentReference,
                    paymentMethod: data.paymentMethod,
                    paymentNotes: data.notes,
                },
            });

            const updatedInvoice = await tx.invoice.findUniqueOrThrow({
                where: { id },
                include: invoiceDetailInclude,
            });

            return {
                invoice: enrichWithAging(updatedInvoice as any),
            };
        });
    },

    // --- Dispute (BE-INV-05) ---

    disputeInvoice: async (id: string, data: DisputeRequest) => {
        const invoice = await getInvoiceOrThrow(id);

        if (invoice.isPaid) {
            throw new BadRequestError('Cannot dispute a paid invoice');
        }
        if (invoice.isDisputed) {
            throw new BadRequestError('Invoice is already disputed');
        }

        if (data.notifyVendor) {
            console.log(`Notify vendor of dispute on invoice ${invoice.invoiceNumber}`);
        }

        return await prisma.invoice.update({
            where: { id },
            data: {
                isDisputed: true,
                disputeReason: data.disputeReason,
                disputeDate: new Date(),
            },
            include: invoiceDetailInclude,
        });
    },

    resolveDispute: async (id: string, data: ResolveDisputeRequest) => {
        const invoice = await getInvoiceOrThrow(id);

        if (!invoice.isDisputed) {
            throw new BadRequestError('Invoice is not disputed');
        }

        return await prisma.invoice.update({
            where: { id },
            data: {
                isDisputed: false,
                disputeResolvedDate: new Date(),
                disputeResolution: data.resolution,
            },
            include: invoiceDetailInclude,
        });
    },

    // --- Summary & Aging (BE-INV-06) ---

    getProjectAgingReport: async (projectId: string, asOfDate?: Date, vendorId?: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const refDate = asOfDate || new Date();

        const invoices = await prisma.invoice.findMany({
            where: {
                projectId,
                isPaid: false,
                deletedAt: null,
                ...(vendorId && { vendorId }),
            },
            select: {
                id: true,
                invoiceNumber: true,
                invoiceDate: true,
                dueDate: true,
                totalAmount: true,
                vendor: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        const buckets = {
            current: { count: 0, amount: 0 },
            days30to60: { count: 0, amount: 0 },
            days60to90: { count: 0, amount: 0 },
            days90plus: { count: 0, amount: 0 },
        };

        let totalOutstanding = 0;
        let totalOverdue = 0;

        const enrichedInvoices = invoices.map((inv) => {
            const aging = calculateAging(inv.dueDate);
            const amount = Number(inv.totalAmount);
            totalOutstanding += amount;

            if (aging.isPastDue) totalOverdue += amount;

            switch (aging.agingBucket) {
                case 'CURRENT':
                    buckets.current.count++;
                    buckets.current.amount += amount;
                    break;
                case 'DAYS_30_60':
                    buckets.days30to60.count++;
                    buckets.days30to60.amount += amount;
                    break;
                case 'DAYS_60_90':
                    buckets.days60to90.count++;
                    buckets.days60to90.amount += amount;
                    break;
                case 'DAYS_90_PLUS':
                    buckets.days90plus.count++;
                    buckets.days90plus.amount += amount;
                    break;
            }

            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                vendorName: inv.vendor.name,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount: amount,
                agingBucket: aging.agingBucket,
                daysOverdue: aging.daysOverdue,
            };
        });

        // Sort most overdue first
        enrichedInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);

        return {
            asOfDate: refDate,
            buckets,
            totalOutstanding,
            totalOverdue,
            invoices: enrichedInvoices,
        };
    },

    getProjectInvoiceSummary: async (projectId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const invoices = await prisma.invoice.findMany({
            where: { projectId, deletedAt: null },
            include: { status: { select: { name: true } } },
        });

        const byStatus: Record<string, { count: number; totalAmount: number }> = {
            pending: { count: 0, totalAmount: 0 },
            approved: { count: 0, totalAmount: 0 },
            rejected: { count: 0, totalAmount: 0 },
        };

        const byType: Record<string, { count: number; totalAmount: number }> = {
            preliminary: { count: 0, totalAmount: 0 },
            final: { count: 0, totalAmount: 0 },
            revision: { count: 0, totalAmount: 0 },
        };

        let totalInvoiced = 0;
        let totalApproved = 0;
        let totalPaid = 0;
        let disputedCount = 0;
        let overdueCount = 0;
        let approvalDaysSum = 0;
        let approvalCount = 0;
        let paymentDaysSum = 0;
        let paymentCount = 0;

        const today = new Date();

        for (const inv of invoices) {
            const amount = Number(inv.totalAmount);
            const statusKey = inv.status.name.toLowerCase();
            const typeKey = inv.invoiceType.toLowerCase();

            if (byStatus[statusKey]) {
                byStatus[statusKey].count++;
                byStatus[statusKey].totalAmount += amount;
            }

            if (byType[typeKey]) {
                byType[typeKey].count++;
                byType[typeKey].totalAmount += amount;
            }

            if (inv.status.name !== 'REJECTED') {
                totalInvoiced += amount;
            }

            if (inv.status.name === 'APPROVED') {
                totalApproved += amount;
            }

            if (inv.isPaid) {
                totalPaid += Number(inv.paidAmount || 0);
            }

            if (inv.isDisputed) disputedCount++;

            if (!inv.isPaid && inv.dueDate < today && inv.status.name !== 'REJECTED') {
                overdueCount++;
            }

            if (inv.approvedAt) {
                const days = Math.floor(
                    (inv.approvedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24)
                );
                approvalDaysSum += days;
                approvalCount++;
            }

            if (inv.isPaid && inv.paidDate && inv.approvedAt) {
                const days = Math.floor(
                    (inv.paidDate.getTime() - inv.approvedAt.getTime()) / (1000 * 60 * 60 * 24)
                );
                paymentDaysSum += days;
                paymentCount++;
            }
        }

        return {
            totalCount: invoices.length,
            totalInvoiced,
            totalApproved,
            totalPaid,
            totalOutstanding: totalInvoiced - totalPaid,
            byStatus,
            byType,
            disputedCount,
            overdueCount,
            avgDaysToApproval: approvalCount > 0 ? approvalDaysSum / approvalCount : 0,
            avgDaysToPayment: paymentCount > 0 ? paymentDaysSum / paymentCount : 0,
        };
    },

    listApprovalQueue: async (params: PaginationParams) => {
        const { skip, take } = params;

        const whereClause = {
            status: { name: 'PENDING' },
            isPaid: false,
            deletedAt: null,
        };

        const [count, data] = await prisma.$transaction([
            prisma.invoice.count({ where: whereClause }),
            prisma.invoice.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
                select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    invoiceDate: true,
                    dueDate: true,
                    isPaid: true,
                    isDisputed: true,
                    createdBy: true,
                    vendor: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    purchaseOrder: { select: { poNumber: true } },
                },
            }),
        ]);

        const enriched = data.map((inv) => {
            const aging = calculateAging(inv.dueDate);
            return { ...inv, ...aging };
        });

        return { data: enriched, count };
    },

    // --- PO & Vendor Queries (BE-INV-07) ---

    listPOInvoices: async (poId: string) => {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        const invoices = await prisma.invoice.findMany({
            where: { purchaseOrderId: poId, deletedAt: null },
            include: { status: statusSelect },
            orderBy: { invoiceDate: 'desc' },
        });

        const enriched = invoices.map((inv) => {
            const aging = inv.isPaid
                ? { daysOverdue: 0, isPastDue: false, agingBucket: 'CURRENT' }
                : calculateAging(inv.dueDate);
            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount: inv.totalAmount,
                status: inv.status,
                isPaid: inv.isPaid,
                paidAmount: inv.paidAmount,
                ...aging,
            };
        });

        // Payment progress
        const totalInvoiced = invoices
            .filter((i) => i.status.name !== 'REJECTED')
            .reduce((sum, i) => sum + Number(i.totalAmount), 0);
        const totalPaid = invoices
            .filter((i) => i.isPaid)
            .reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);
        const poTotalCommitment = Number(po.totalCommitment);

        return {
            invoices: enriched,
            paymentProgress: {
                poTotal: Number(po.total),
                poTotalCommitment,
                totalInvoiced,
                totalPaid,
                invoicedPercent:
                    poTotalCommitment > 0 ? (totalInvoiced / poTotalCommitment) * 100 : 0,
                paidPercent: poTotalCommitment > 0 ? (totalPaid / poTotalCommitment) * 100 : 0,
                remainingBalance: poTotalCommitment - totalPaid,
            },
        };
    },

    listVendorInvoices: async (vendorId: string, params: PaginationParams) => {
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        const { filter, skip, take, sortBy, sortOrder } = params;
        const { projectId, status, isPaid, startDate, endDate } = filter || {};

        const whereClause: Record<string, unknown> = {
            vendorId,
            deletedAt: null,
            ...(projectId && { projectId }),
            ...(status && { status: { name: status } }),
            ...(isPaid !== undefined && { isPaid: isPaid === 'true' }),
        };

        const andConditions: unknown[] = [];
        if (startDate) andConditions.push({ invoiceDate: { gte: new Date(startDate as string) } });
        if (endDate) andConditions.push({ invoiceDate: { lte: new Date(endDate as string) } });
        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.invoice.count({ where: whereClause }),
            prisma.invoice.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    ...invoiceListSelect,
                    project: { select: { id: true, name: true } },
                },
            }),
        ]);

        const enriched = data.map((inv) => enrichWithAging(inv as any));

        // Vendor-level summary
        const allVendorInvoices = await prisma.invoice.findMany({
            where: { vendorId, deletedAt: null },
            select: {
                totalAmount: true,
                paidAmount: true,
                isPaid: true,
                paidDate: true,
                approvedAt: true,
            },
        });

        const totalInvoiced = allVendorInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
        const totalPaidAmount = allVendorInvoices
            .filter((i) => i.isPaid)
            .reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);

        let payDaysSum = 0;
        let payDaysCount = 0;
        for (const inv of allVendorInvoices) {
            if (inv.isPaid && inv.paidDate && inv.approvedAt) {
                payDaysSum += Math.floor(
                    (inv.paidDate.getTime() - inv.approvedAt.getTime()) / (1000 * 60 * 60 * 24)
                );
                payDaysCount++;
            }
        }

        return {
            data: enriched,
            count,
            summary: {
                totalInvoiced,
                totalPaid: totalPaidAmount,
                totalOutstanding: totalInvoiced - totalPaidAmount,
                avgDaysToPay: payDaysCount > 0 ? payDaysSum / payDaysCount : 0,
            },
        };
    },
};
