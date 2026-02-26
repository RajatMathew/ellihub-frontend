import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { recalcProjectDates } from '@modules/project/services';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { PCOCreateRequest, PCOStatusTransitionRequest, PCOUpdateRequest } from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const pcoDetailInclude = {
    project: { select: { id: true, name: true, jobNumber: true } },
    status: statusSelect,
    creator: { select: { id: true, name: true, email: true } },
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
    creator: { select: { id: true, name: true } },
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

        return { data, count };
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
        return pco;
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
};
