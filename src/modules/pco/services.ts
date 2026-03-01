import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { recalcProjectDates } from '@modules/project/services';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    PCOCreateRequest,
    PCOLineItemCreateRequest,
    PCOLineItemUpdateRequest,
    PCORejectRequest,
    PCOStatusTransitionRequest,
    PCOUpdateRequest,
    PCOVoidRequest,
} from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const pcoDetailInclude = {
    project: { select: { id: true, name: true, jobNumber: true } },
    status: statusSelect,
    contact: { select: { id: true, fullName: true } },
    changeType: { select: { id: true, name: true, code: true, color: true } },
    costCode: { select: { id: true, name: true, code: true } },
    lineItems: { where: { deletedAt: null }, orderBy: { sequenceNumber: 'asc' as const } },
    attachments: { include: { document: { select: { id: true, name: true } } } },
    statusHistory: {
        orderBy: { createdAt: 'desc' as const },
        include: { fromStatus: statusSelect, toStatus: statusSelect },
    },
    supersededByOrder: { select: { id: true, pcoNumber: true } },
} as const;

const pcoListSelect = {
    id: true,
    pcoNumber: true,
    date: true,
    title: true,
    amount: true,
    status: statusSelect,
    priority: true,
    impactsSchedule: true,
    changeType: { select: { id: true, name: true, code: true, color: true } },
    project: { select: { id: true, name: true, jobNumber: true } },
    createdBy: true,
    _count: { select: { lineItems: { where: { deletedAt: null } } } },
    createdAt: true,
} as const;

const ALL_STATUSES = [
    'DRAFT',
    'PENDING_REVIEW',
    'REVERTED',
    'APPROVED',
    'SENT_TO_GC',
    'PENCILED',
    'EXECUTED',
    'REJECTED',
    'VOID',
];
const allExcept = (...exclude: string[]) => ALL_STATUSES.filter((s) => !exclude.includes(s));

const validTransitions: Record<string, string[]> = {
    DRAFT: allExcept('DRAFT'),
    PENDING_REVIEW: allExcept('PENDING_REVIEW'),
    REVERTED: allExcept('REVERTED'),
    APPROVED: allExcept('APPROVED'),
    SENT_TO_GC: allExcept('SENT_TO_GC'),
    PENCILED: allExcept('PENCILED'),
    EXECUTED: ['VOID'],
    REJECTED: [],
    VOID: [],
};

const REASON_REQUIRED_STATUSES = ['REVERTED', 'REJECTED', 'VOID'];

function computeMargin(amount: number, estimatedCost: number | null | undefined) {
    if (estimatedCost != null && amount !== 0) {
        const estimatedMargin = amount - estimatedCost;
        const estimatedMarginPercent = (estimatedMargin / amount) * 100;
        return { estimatedMargin, estimatedMarginPercent };
    }
    return { estimatedMargin: null, estimatedMarginPercent: null };
}

async function getPCOOrThrow(id: string) {
    const pco = await prisma.primeChangeOrder.findUnique({
        where: { id },
        include: { status: { select: { id: true, name: true } } },
    });
    if (!pco) throw new NotFoundError('Prime Change Order not found');
    checkDeletedAt(pco);
    return pco;
}

async function getStatusByName(name: string) {
    const status = await prisma.changeOrderStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`Status '${name}' not configured`);
    return status;
}

export const PCOService = {
    listPCOs: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            projectId,
            status,
            changeTypeId,
            priority,
            dateFrom,
            dateTo,
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
            ...(changeTypeId && { changeTypeId }),
            ...(priority && { priority }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { pcoNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        if (dateFrom || dateTo) {
            whereClause.date = {
                ...(dateFrom && { gte: new Date(dateFrom as string) }),
                ...(dateTo && { lte: new Date(dateTo as string) }),
            };
        }

        const [count, data] = await prisma.$transaction([
            prisma.primeChangeOrder.count({ where: whereClause }),
            prisma.primeChangeOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: pcoListSelect,
            }),
        ]);

        // Batch-fetch creator info
        const creatorIds = [...new Set(data.map((p) => p.createdBy))];
        const creators = await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true },
        });
        const creatorMap = new Map(creators.map((c) => [c.id, c]));
        const enriched = data.map((p) => ({
            ...p,
            creator: creatorMap.get(p.createdBy) ?? null,
        }));

        return { data: enriched, count };
    },

    createPCO: async (data: PCOCreateRequest, userId: string) => {
        const { lineItems, ...pcoData } = data;

        // Validate project
        const project = await prisma.project.findUnique({ where: { id: pcoData.projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        // Validate optional FKs
        if (pcoData.contactId) {
            const contact = await prisma.contact.findUnique({ where: { id: pcoData.contactId } });
            if (!contact) throw new NotFoundError('Contact not found');
            checkDeletedAt(contact);
        }
        if (pcoData.changeTypeId) {
            const changeType = await prisma.pCOChangeType.findUnique({
                where: { id: pcoData.changeTypeId },
            });
            if (!changeType) throw new NotFoundError('Change type not found');
        }
        if (pcoData.costCodeId) {
            const costCode = await prisma.costCode.findUnique({
                where: { id: pcoData.costCodeId },
            });
            if (!costCode) throw new NotFoundError('Cost code not found');
            checkDeletedAt(costCode);
        }

        // Look up DRAFT status
        const draftStatus = await prisma.changeOrderStatus.findFirst({
            where: { name: 'DRAFT' },
        });
        if (!draftStatus) throw new BadRequestError('DRAFT status not configured');

        return await prisma.$transaction(async (tx) => {
            // Auto-generate pcoNumber
            const proj = await tx.project.findUniqueOrThrow({
                where: { id: pcoData.projectId },
                select: { jobNumber: true },
            });
            const latest = await tx.primeChangeOrder.findFirst({
                where: { projectId: pcoData.projectId },
                orderBy: { pcoNumber: 'desc' },
                select: { pcoNumber: true },
            });
            let seq = 1;
            if (latest?.pcoNumber) {
                const parts = latest.pcoNumber.split('-');
                seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
            }
            const pcoNumber = `PCO-${proj.jobNumber}-${String(seq).padStart(3, '0')}`;

            // Compute margin
            const margin = computeMargin(pcoData.amount, pcoData.estimatedCost);

            const pcoId = ulid();

            await tx.primeChangeOrder.create({
                data: {
                    id: pcoId,
                    projectId: pcoData.projectId,
                    statusId: draftStatus.id,
                    pcoNumber,
                    date: pcoData.date,
                    title: pcoData.title,
                    description: pcoData.description,
                    amount: pcoData.amount,
                    createdBy: userId,
                    markupAmount: pcoData.markupAmount,
                    scheduleImpactDays: pcoData.scheduleImpactDays,
                    requestedBy: pcoData.requestedBy,
                    contactId: pcoData.contactId,
                    changeTypeId: pcoData.changeTypeId,
                    priority: pcoData.priority,
                    impactsSchedule: pcoData.impactsSchedule,
                    estimatedCost: pcoData.estimatedCost,
                    estimatedMargin: margin.estimatedMargin,
                    estimatedMarginPercent: margin.estimatedMarginPercent,
                    costCodeId: pcoData.costCodeId,
                },
            });

            // Create line items
            await tx.primeCOLineItem.createMany({
                data: lineItems.map((item, index) => ({
                    id: ulid(),
                    primeCoId: pcoId,
                    sequenceNumber: index + 1,
                    title: item.title,
                    description: item.description,
                    qty: item.qty,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    amount: item.qty * item.unitPrice,
                    costCodeId: item.costCodeId,
                })),
            });

            return await tx.primeChangeOrder.findUniqueOrThrow({
                where: { id: pcoId },
                include: pcoDetailInclude,
            });
        });
    },

    getPCO: async (id: string) => {
        const pco = await prisma.primeChangeOrder.findUnique({
            where: { id },
            include: pcoDetailInclude,
        });
        if (!pco) throw new NotFoundError('Prime Change Order not found');
        checkDeletedAt(pco);

        const creator = await prisma.user.findUnique({
            where: { id: pco.createdBy },
            select: { id: true, name: true, email: true },
        });

        return { ...pco, creator };
    },

    updatePCO: async (id: string, data: PCOUpdateRequest) => {
        const pco = await prisma.primeChangeOrder.findUnique({
            where: { id },
            include: { status: { select: { name: true } } },
        });
        if (!pco) throw new NotFoundError('Prime Change Order not found');
        checkDeletedAt(pco);

        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT change orders can be updated');
        }

        // Validate optional FKs if changed
        if (data.contactId) {
            const contact = await prisma.contact.findUnique({ where: { id: data.contactId } });
            if (!contact) throw new NotFoundError('Contact not found');
            checkDeletedAt(contact);
        }
        if (data.changeTypeId) {
            const changeType = await prisma.pCOChangeType.findUnique({
                where: { id: data.changeTypeId },
            });
            if (!changeType) throw new NotFoundError('Change type not found');
        }
        if (data.costCodeId) {
            const costCode = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!costCode) throw new NotFoundError('Cost code not found');
            checkDeletedAt(costCode);
        }

        const updateData: Record<string, unknown> = { ...data };

        // Recompute margin only if amount or estimatedCost changed
        if (data.amount !== undefined || data.estimatedCost !== undefined) {
            const newAmount = data.amount ?? pco.amount;
            const newEstimatedCost =
                data.estimatedCost !== undefined ? data.estimatedCost : pco.estimatedCost;
            const margin = computeMargin(newAmount, newEstimatedCost);
            updateData.estimatedMargin = margin.estimatedMargin;
            updateData.estimatedMarginPercent = margin.estimatedMarginPercent;
        }

        return await prisma.primeChangeOrder.update({
            where: { id },
            data: updateData,
            include: pcoDetailInclude,
        });
    },

    deletePCO: async (id: string) => {
        const pco = await prisma.primeChangeOrder.findUnique({
            where: { id },
            include: { status: { select: { name: true } } },
        });
        if (!pco) throw new NotFoundError('Prime Change Order not found');
        checkDeletedAt(pco);

        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT change orders can be deleted');
        }

        const now = new Date();
        await prisma.$transaction([
            prisma.primeCOLineItem.updateMany({
                where: { primeCoId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.primeChangeOrder.update({
                where: { id },
                data: { deletedAt: now },
            }),
        ]);
    },

    transitionStatus: async (id: string, data: PCOStatusTransitionRequest, userId: string) => {
        const pco = await prisma.primeChangeOrder.findUnique({
            where: { id },
            include: { status: { select: { id: true, name: true } } },
        });
        if (!pco) throw new NotFoundError('Prime Change Order not found');
        checkDeletedAt(pco);

        const { status: targetStatusName, reason, onBehalfOf } = data;
        const fromName = pco.status.name;

        // Validate transition
        if (!validTransitions[fromName]?.includes(targetStatusName)) {
            throw new BadRequestError(
                `Invalid status transition from ${fromName} to ${targetStatusName}`
            );
        }

        // Reason required for REVERTED, REJECTED, VOID
        if (REASON_REQUIRED_STATUSES.includes(targetStatusName) && !reason) {
            throw new BadRequestError(
                `Reason is required when transitioning to ${targetStatusName}`
            );
        }

        // Look up target status
        const targetStatus = await prisma.changeOrderStatus.findFirst({
            where: { name: targetStatusName },
        });
        if (!targetStatus) {
            throw new BadRequestError(`Status '${targetStatusName}' not found`);
        }

        return await prisma.$transaction(async (tx) => {
            // Update PCO status
            await tx.primeChangeOrder.update({
                where: { id },
                data: { statusId: targetStatus.id },
            });

            // Log status history
            await tx.pCOStatusHistory.create({
                data: {
                    id: ulid(),
                    pcoId: id,
                    fromStatusId: pco.status.id,
                    toStatusId: targetStatus.id,
                    changedBy: userId,
                    onBehalfOf,
                    reason,
                },
            });

            // → EXECUTED: create audit schedule entry if impacts schedule
            if (targetStatusName === 'EXECUTED') {
                if (pco.impactsSchedule && pco.scheduleImpactDays) {
                    await tx.projectScheduleEntry.create({
                        data: {
                            id: ulid(),
                            projectId: pco.projectId,
                            date: new Date(),
                            description: `CO #${pco.pcoNumber}: ${pco.title}`,
                            changeOrderId: id,
                        },
                    });
                }
            }

            // → VOID: soft-delete linked schedule entries
            if (targetStatusName === 'VOID') {
                await tx.projectScheduleEntry.updateMany({
                    where: { changeOrderId: id, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            }

            // Recalc project dates if schedule was affected
            if (
                (targetStatusName === 'EXECUTED' &&
                    pco.impactsSchedule &&
                    pco.scheduleImpactDays) ||
                targetStatusName === 'VOID'
            ) {
                await recalcProjectDates(pco.projectId, tx);
            }

            return await tx.primeChangeOrder.findUniqueOrThrow({
                where: { id },
                include: pcoDetailInclude,
            });
        });
    },

    // --- Line Items (BE-PCO-03) ---

    addLineItem: async (pcoId: string, data: PCOLineItemCreateRequest) => {
        const pco = await getPCOOrThrow(pcoId);
        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only add line items to DRAFT PCOs');
        }

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new NotFoundError('Cost code not found');
            checkDeletedAt(cc);
        }

        return await prisma.$transaction(async (tx) => {
            const maxSeq = await tx.primeCOLineItem.aggregate({
                where: { primeCoId: pcoId, deletedAt: null },
                _max: { sequenceNumber: true },
            });

            const lineItem = await tx.primeCOLineItem.create({
                data: {
                    id: ulid(),
                    primeCoId: pcoId,
                    sequenceNumber: (maxSeq._max.sequenceNumber || 0) + 1,
                    title: data.title,
                    description: data.description,
                    qty: data.qty,
                    unit: data.unit,
                    unitPrice: data.unitPrice,
                    amount: data.qty * data.unitPrice,
                    costCodeId: data.costCodeId,
                },
            });

            // Warn if line items sum doesn't match PCO amount
            const allItems = await tx.primeCOLineItem.findMany({
                where: { primeCoId: pcoId, deletedAt: null },
            });
            const lineItemsSum = allItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
            const amountMismatch =
                Math.abs(Number(pco.amount) - lineItemsSum) > 0.01
                    ? `Line items total (${lineItemsSum.toFixed(2)}) differs from PCO amount (${Number(pco.amount).toFixed(2)})`
                    : null;

            return { lineItem, amountMismatch };
        });
    },

    updateLineItem: async (pcoId: string, lineItemId: string, data: PCOLineItemUpdateRequest) => {
        const pco = await getPCOOrThrow(pcoId);
        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only update line items on DRAFT PCOs');
        }

        const lineItem = await prisma.primeCOLineItem.findFirst({
            where: { id: lineItemId, primeCoId: pcoId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new NotFoundError('Cost code not found');
            checkDeletedAt(cc);
        }

        return await prisma.$transaction(async (tx) => {
            const qty = data.qty ?? Number(lineItem.qty);
            const price = data.unitPrice ?? Number(lineItem.unitPrice);
            const amount = qty * price;

            const updated = await tx.primeCOLineItem.update({
                where: { id: lineItemId },
                data: {
                    ...(data.title !== undefined && { title: data.title }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.qty !== undefined && { qty: data.qty }),
                    ...(data.unit !== undefined && { unit: data.unit }),
                    ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
                    ...(data.costCodeId !== undefined && { costCodeId: data.costCodeId }),
                    amount,
                },
            });

            // Warn if line items sum doesn't match PCO amount
            const allItems = await tx.primeCOLineItem.findMany({
                where: { primeCoId: pcoId, deletedAt: null },
            });
            const lineItemsSum = allItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
            const amountMismatch =
                Math.abs(Number(pco.amount) - lineItemsSum) > 0.01
                    ? `Line items total (${lineItemsSum.toFixed(2)}) differs from PCO amount (${Number(pco.amount).toFixed(2)})`
                    : null;

            return { lineItem: updated, amountMismatch };
        });
    },

    removeLineItem: async (pcoId: string, lineItemId: string) => {
        const pco = await getPCOOrThrow(pcoId);
        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only remove line items from DRAFT PCOs');
        }

        const lineItem = await prisma.primeCOLineItem.findFirst({
            where: { id: lineItemId, primeCoId: pcoId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        const count = await prisma.primeCOLineItem.count({
            where: { primeCoId: pcoId, deletedAt: null },
        });
        if (count <= 1) {
            throw new BadRequestError('PCO must have at least one line item');
        }

        await prisma.primeCOLineItem.delete({ where: { id: lineItemId } });
    },

    // --- Dedicated Workflow (BE-PCO-04) ---

    approvePCO: async (id: string, userId: string) => {
        const pco = await getPCOOrThrow(id);

        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT PCOs can be approved');
        }

        // Segregation of duties
        if (userId === pco.createdBy) {
            throw new BadRequestError('Creator cannot approve their own PCO');
        }

        const approvedStatus = await getStatusByName('APPROVED');

        return await prisma.$transaction(async (tx) => {
            await tx.primeChangeOrder.update({
                where: { id },
                data: {
                    statusId: approvedStatus.id,
                    approvedBy: userId,
                    approvedAt: new Date(),
                },
            });

            // Log status history
            await tx.pCOStatusHistory.create({
                data: {
                    id: ulid(),
                    pcoId: id,
                    fromStatusId: pco.status.id,
                    toStatusId: approvedStatus.id,
                    changedBy: userId,
                },
            });

            // Schedule entry if impact
            if (pco.impactsSchedule && pco.scheduleImpactDays) {
                await tx.projectScheduleEntry.create({
                    data: {
                        id: ulid(),
                        projectId: pco.projectId,
                        date: new Date(),
                        description: `CO #${pco.pcoNumber}: ${pco.title}`,
                        changeOrderId: id,
                    },
                });
                await recalcProjectDates(pco.projectId, tx);
            }

            const updatedPCO = await tx.primeChangeOrder.findUniqueOrThrow({
                where: { id },
                include: pcoDetailInclude,
            });

            // Compute financial impact
            const contract = await tx.primeContract.findUnique({
                where: { projectId: pco.projectId },
            });
            const originalContractValue = Number(contract?.contractValue || 0);

            const approvedAgg = await tx.primeChangeOrder.aggregate({
                where: {
                    projectId: pco.projectId,
                    statusId: approvedStatus.id,
                    deletedAt: null,
                },
                _sum: { amount: true },
            });
            const approvedPCOTotal = Number(approvedAgg._sum.amount || 0);
            const revisedContractValue = originalContractValue + approvedPCOTotal;
            const budgetPercent = Number(contract?.targetBudgetPercent || 100);
            const budgetLimit = revisedContractValue * (budgetPercent / 100);

            return {
                pco: updatedPCO,
                financialImpact: {
                    originalContractValue,
                    approvedPCOTotal,
                    thisAmount: Number(pco.amount),
                    revisedContractValue,
                    budgetLimit,
                },
            };
        });
    },

    rejectPCO: async (id: string, data: PCORejectRequest, userId: string) => {
        const pco = await getPCOOrThrow(id);

        if (pco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT PCOs can be rejected');
        }

        const rejectedStatus = await getStatusByName('REJECTED');

        await prisma.$transaction(async (tx) => {
            await tx.primeChangeOrder.update({
                where: { id },
                data: {
                    statusId: rejectedStatus.id,
                    rejectedBy: userId,
                    rejectedAt: new Date(),
                    rejectionReason: data.reason,
                },
            });

            await tx.pCOStatusHistory.create({
                data: {
                    id: ulid(),
                    pcoId: id,
                    fromStatusId: pco.status.id,
                    toStatusId: rejectedStatus.id,
                    changedBy: userId,
                    reason: data.reason,
                },
            });
        });

        return await prisma.primeChangeOrder.findUniqueOrThrow({
            where: { id },
            include: pcoDetailInclude,
        });
    },

    voidPCO: async (id: string, data: PCOVoidRequest, userId: string) => {
        const pco = await getPCOOrThrow(id);

        if (pco.status.name === 'VOID' || pco.status.name === 'REJECTED') {
            throw new BadRequestError(`Cannot void a ${pco.status.name} PCO`);
        }

        const wasExecuted = pco.status.name === 'EXECUTED';

        // If voiding an executed PCO, check for invoices
        if (wasExecuted) {
            const invoiceCount = await prisma.invoice.count({
                where: {
                    projectId: pco.projectId,
                    deletedAt: null,
                    createdAt: { gte: pco.approvedAt || pco.createdAt },
                },
            });
            if (invoiceCount > 0) {
                throw new BadRequestError(
                    'Cannot void an executed PCO with related invoices. Create a reversal PCO instead.'
                );
            }
        }

        const voidStatus = await getStatusByName('VOID');

        return await prisma.$transaction(async (tx) => {
            await tx.primeChangeOrder.update({
                where: { id },
                data: {
                    statusId: voidStatus.id,
                    voidedBy: userId,
                    voidedAt: new Date(),
                    voidReason: data.reason,
                },
            });

            await tx.pCOStatusHistory.create({
                data: {
                    id: ulid(),
                    pcoId: id,
                    fromStatusId: pco.status.id,
                    toStatusId: voidStatus.id,
                    changedBy: userId,
                    reason: data.reason,
                },
            });

            // Soft-delete linked schedule entries
            await tx.projectScheduleEntry.updateMany({
                where: { changeOrderId: id, deletedAt: null },
                data: { deletedAt: new Date() },
            });

            // Recalc project dates if this PCO had schedule impact
            if (pco.impactsSchedule && pco.scheduleImpactDays) {
                await recalcProjectDates(pco.projectId, tx);
            }

            return await tx.primeChangeOrder.findUniqueOrThrow({
                where: { id },
                include: pcoDetailInclude,
            });
        });
    },

    // --- Pipeline & Financial Impact (BE-PCO-05) ---

    getPipeline: async (projectId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const allPCOs = await prisma.primeChangeOrder.findMany({
            where: { projectId, deletedAt: null },
            select: { amount: true, status: { select: { name: true } } },
        });

        const byStatus: Record<string, { count: number; totalAmount: number }> = {
            draft: { count: 0, totalAmount: 0 },
            pending_review: { count: 0, totalAmount: 0 },
            approved: { count: 0, totalAmount: 0 },
            sent_to_gc: { count: 0, totalAmount: 0 },
            penciled: { count: 0, totalAmount: 0 },
            executed: { count: 0, totalAmount: 0 },
            rejected: { count: 0, totalAmount: 0 },
            void: { count: 0, totalAmount: 0 },
        };

        for (const pco of allPCOs) {
            const key = pco.status.name.toLowerCase();
            if (byStatus[key]) {
                byStatus[key].count++;
                byStatus[key].totalAmount += Number(pco.amount);
            }
        }

        return byStatus;
    },

    getFinancialImpact: async (id: string) => {
        const pco = await prisma.primeChangeOrder.findUnique({
            where: { id },
            include: { status: { select: { name: true } } },
        });
        if (!pco) throw new NotFoundError('Prime Change Order not found');
        checkDeletedAt(pco);

        const contract = await prisma.primeContract.findUnique({
            where: { projectId: pco.projectId },
        });
        const originalContractValue = Number(contract?.contractValue || 0);
        const budgetPercent = Number(contract?.targetBudgetPercent || 100);

        // Get all executed/approved PCOs for this project
        const executedStatus = await prisma.changeOrderStatus.findFirst({
            where: { name: 'EXECUTED' },
        });
        const approvedStatus = await prisma.changeOrderStatus.findFirst({
            where: { name: 'APPROVED' },
        });
        const statusIds = [executedStatus?.id, approvedStatus?.id].filter(Boolean) as string[];

        const approvedAgg = await prisma.primeChangeOrder.aggregate({
            where: {
                projectId: pco.projectId,
                statusId: { in: statusIds },
                deletedAt: null,
                id: { not: pco.id },
            },
            _sum: { amount: true },
        });
        const existingApprovedTotal = Number(approvedAgg._sum.amount || 0);

        // Include this PCO if already approved/executed
        const isApprovedOrExecuted = ['APPROVED', 'EXECUTED'].includes(pco.status.name);
        const currentApprovedTotal = isApprovedOrExecuted
            ? existingApprovedTotal + Number(pco.amount)
            : existingApprovedTotal;

        const currentRevisedValue = originalContractValue + currentApprovedTotal;
        const currentBudgetLimit = currentRevisedValue * (budgetPercent / 100);

        const afterApprovalTotal = existingApprovedTotal + Number(pco.amount);
        const afterRevisedValue = originalContractValue + afterApprovalTotal;
        const afterBudgetLimit = afterRevisedValue * (budgetPercent / 100);
        const percentChange =
            originalContractValue !== 0
                ? ((afterRevisedValue - originalContractValue) / originalContractValue) * 100
                : 0;

        return {
            current: {
                originalContractValue,
                approvedPCOTotal: currentApprovedTotal,
                revisedContractValue: currentRevisedValue,
                budgetLimit: currentBudgetLimit,
            },
            afterApproval: {
                approvedPCOTotal: afterApprovalTotal,
                revisedContractValue: afterRevisedValue,
                budgetLimit: afterBudgetLimit,
                percentChangeFromOriginal: percentChange,
            },
            thisPCO: {
                amount: Number(pco.amount),
                percentOfOriginalContract:
                    originalContractValue !== 0
                        ? (Math.abs(Number(pco.amount)) / originalContractValue) * 100
                        : 0,
            },
        };
    },
};
