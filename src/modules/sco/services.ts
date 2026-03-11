import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    RejectRequest,
    SCOCreateRequest,
    SCOLineItemCreateRequest,
    SCOLineItemUpdateRequest,
    SCOUpdateRequest,
    VoidRequest,
} from './models';

const statusSelect = { select: { id: true, name: true, label: true, color: true, order: true } };

const scoListSelect = {
    id: true,
    scoNumber: true,
    title: true,
    amount: true,
    status: statusSelect,
    date: true,
    initiatedBy: true,
    priority: true,
    purchaseOrder: { select: { id: true, poNumber: true } },
    vendor: { select: { id: true, name: true } },
    changeType: { select: { id: true, name: true, code: true, color: true } },
    _count: { select: { lineItems: { where: { deletedAt: null } } } },
    createdAt: true,
} as const;

const scoDetailInclude = {
    purchaseOrder: {
        select: {
            id: true,
            poNumber: true,
            total: true,
            totalCommitment: true,
            status: statusSelect,
        },
    },
    project: { select: { id: true, name: true, jobNumber: true } },
    vendor: { select: { id: true, name: true, email: true, phone: true } },
    status: statusSelect,
    changeType: { select: { id: true, name: true, code: true, color: true } },
    costCode: { select: { id: true, name: true, code: true } },
    linkedPCO: { select: { id: true, pcoNumber: true, amount: true } },
    lineItems: {
        where: { deletedAt: null },
        orderBy: { lineNumber: 'asc' as const },
    },
    attachments: {
        include: { document: { select: { id: true, name: true } } },
    },
    statusHistory: {
        orderBy: { createdAt: 'desc' as const },
        include: { fromStatus: statusSelect, toStatus: statusSelect },
    },
} as const;

async function getStatusByName(name: string) {
    const status = await prisma.changeOrderStatus.findFirst({ where: { name } });
    if (!status) throw new BadRequestError(`Status '${name}' not configured`);
    return status;
}

async function getSCOOrThrow(id: string) {
    const sco = await prisma.purchaseOrderCO.findUnique({
        where: { id },
        include: { status: { select: { id: true, name: true } } },
    });
    if (!sco) throw new NotFoundError('Change order not found');
    checkDeletedAt(sco);
    return sco;
}

function validateLineItemsSum(amount: number, lineItems: { qty: number; unitPrice: number }[]) {
    const lineItemsSum = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
    if (Math.abs(amount - lineItemsSum) > 0.01) {
        throw new BadRequestError('SCO amount must match line items total');
    }
}

function computePercentWarnings(amount: number, poTotal: number) {
    const percentOfPO = poTotal !== 0 ? (Math.abs(amount) / Math.abs(poTotal)) * 100 : 0;
    let percentWarning = null;
    let percentAlert = null;

    if (percentOfPO >= 50) {
        percentAlert = 'Consider creating a new PO instead';
        percentWarning = `SCO is ${percentOfPO.toFixed(1)}% of PO total`;
    } else if (percentOfPO >= 25) {
        percentWarning = `SCO is ${percentOfPO.toFixed(1)}% of PO total`;
    }

    return { percentWarning, percentAlert };
}

async function recalcPOCommitment(poId: string, tx: TransactionClient) {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });

    const approvedStatus = await tx.changeOrderStatus.findFirst({ where: { name: 'APPROVED' } });
    if (!approvedStatus) return;

    const scoAgg = await tx.purchaseOrderCO.aggregate({
        where: {
            purchaseOrderId: poId,
            statusId: approvedStatus.id,
            deletedAt: null,
        },
        _sum: { amount: true },
    });

    const approvedSCOTotal = Number(scoAgg._sum.amount || 0);
    const newCommitment = Number(po.total) + approvedSCOTotal;

    await tx.purchaseOrder.update({
        where: { id: poId },
        data: { totalCommitment: newCommitment },
    });

    return { previousCommitment: Number(po.totalCommitment), newCommitment };
}

export const SCOService = {
    // --- CRUD (BE-SCO-02) ---

    listSCOsByPO: async (
        poId: string,
        params: PaginationParams
    ): Promise<{ data: unknown[]; count: number }> => {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        const { filter, skip, take, sortBy, sortOrder } = params;
        const { status } = filter || {};

        const whereClause: Record<string, unknown> = {
            purchaseOrderId: poId,
            deletedAt: null,
            ...(status && { status: { name: status } }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrderCO.count({ where: whereClause }),
            prisma.purchaseOrderCO.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: scoListSelect,
            }),
        ]);

        return { data, count };
    },

    listSCOsByProject: async (
        projectId: string,
        params: PaginationParams
    ): Promise<{ data: unknown[]; count: number }> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            status,
            poId,
            vendorId,
            initiatedBy,
            changeType,
            startDate,
            endDate,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            projectId,
            deletedAt: null,
            ...restFilter,
            ...(status && { status: { name: status } }),
            ...(poId && { purchaseOrderId: poId }),
            ...(vendorId && { vendorId }),
            ...(initiatedBy && { initiatedBy }),
            ...(changeType && { changeType: { name: changeType } }),
        };

        const andConditions: unknown[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { scoNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { reasonForChange: { contains: search, mode: 'insensitive' as const } },
                ],
            });
        }

        if (startDate) {
            andConditions.push({ date: { gte: new Date(startDate as string) } });
        }
        if (endDate) {
            andConditions.push({ date: { lte: new Date(endDate as string) } });
        }

        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrderCO.count({ where: whereClause }),
            prisma.purchaseOrderCO.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    ...scoListSelect,
                    project: { select: { id: true, name: true, jobNumber: true } },
                },
            }),
        ]);

        return { data, count };
    },

    createSCO: async (data: SCOCreateRequest, userId: string) => {
        const { lineItems, ...scoData } = data;

        // Validate PO
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: scoData.purchaseOrderId },
            include: { status: { select: { name: true } } },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        if (po.status.name === 'DRAFT') {
            throw new BadRequestError('Cannot create SCO on a DRAFT PO');
        }

        // Validate line items sum
        validateLineItemsSum(scoData.amount, lineItems);

        // Validate cost codes
        if (scoData.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: scoData.costCodeId } });
            if (!cc) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(cc);
        }
        for (const li of lineItems) {
            if (li.costCodeId) {
                const cc = await prisma.costCode.findUnique({ where: { id: li.costCodeId } });
                if (!cc) throw new BadRequestError('Invalid cost code');
                checkDeletedAt(cc);
            }
            if (li.poLineItemId) {
                const poli = await prisma.purchaseOrderLineItem.findFirst({
                    where: {
                        id: li.poLineItemId,
                        purchaseOrderId: scoData.purchaseOrderId,
                        deletedAt: null,
                    },
                });
                if (!poli) throw new BadRequestError('PO line item not found on this PO');
            }
        }

        // Validate linked PCO
        if (scoData.linkedPCOId) {
            const pco = await prisma.primeChangeOrder.findUnique({
                where: { id: scoData.linkedPCOId },
            });
            if (!pco) throw new NotFoundError('Linked PCO not found');
        }

        // Get DRAFT status
        const draftStatus = await getStatusByName('DRAFT');

        // Get change type ID if enum name provided
        let changeTypeId: string | undefined;
        if (scoData.changeType) {
            const ct = await prisma.sCOChangeType.findFirst({
                where: { name: scoData.changeType },
            });
            if (ct) changeTypeId = ct.id;
        }

        return await prisma.$transaction(async (tx) => {
            // Auto-generate scoNumber
            const latestSCO = await tx.purchaseOrderCO.findFirst({
                where: { purchaseOrderId: scoData.purchaseOrderId },
                orderBy: { scoNumber: 'desc' },
                select: { scoNumber: true },
            });

            let seq = 1;
            if (latestSCO?.scoNumber) {
                const parts = latestSCO.scoNumber.split('-');
                seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
            }
            const scoNumber = `SCO-${po.poNumber}-${String(seq).padStart(3, '0')}`;

            const scoId = ulid();

            await tx.purchaseOrderCO.create({
                data: {
                    id: scoId,
                    purchaseOrderId: scoData.purchaseOrderId,
                    projectId: po.projectId,
                    vendorId: po.vendorId,
                    scoNumber,
                    title: scoData.title,
                    date: scoData.date || new Date(),
                    statusId: draftStatus.id,
                    amount: scoData.amount,
                    reasonForChange: scoData.reasonForChange,
                    detailedScope: scoData.detailedScope,
                    scheduleImpactDays: scoData.scheduleImpactDays,
                    initiatedBy: scoData.initiatedBy,
                    priority: scoData.priority || 'MEDIUM',
                    vendorContactName: scoData.vendorContactName,
                    vendorContactEmail: scoData.vendorContactEmail,
                    vendorReferenceNumber: scoData.vendorReferenceNumber,
                    changeTypeId,
                    linkedPCOId: scoData.linkedPCOId,
                    rfqId: scoData.rfqId,
                    costCodeId: scoData.costCodeId,
                    createdBy: userId,
                },
            });

            // Create line items
            for (let i = 0; i < lineItems.length; i++) {
                const li = lineItems[i];
                await tx.purchaseOrderCOLineItem.create({
                    data: {
                        id: ulid(),
                        pcoId: scoId,
                        lineNumber: i + 1,
                        description: li.description,
                        quantity: li.qty,
                        unit: li.unit,
                        unitPrice: li.unitPrice,
                        amount: li.qty * li.unitPrice,
                        costCodeId: li.costCodeId,
                        costCategory: li.costCategory,
                        poLineItemId: li.poLineItemId,
                        notes: li.notes,
                    },
                });
            }

            const created = await tx.purchaseOrderCO.findUniqueOrThrow({
                where: { id: scoId },
                include: scoDetailInclude,
            });

            // Compute percent warnings
            const warnings = computePercentWarnings(scoData.amount, Number(po.total));

            return { ...created, ...warnings };
        });
    },

    getSCO: async (id: string) => {
        const sco = await prisma.purchaseOrderCO.findUnique({
            where: { id },
            include: scoDetailInclude,
        });
        if (!sco) throw new NotFoundError('Change order not found');
        checkDeletedAt(sco);

        // Compute financial impact
        const poTotal = Number(sco.purchaseOrder.total);
        const currentCommitment = Number(sco.purchaseOrder.totalCommitment);
        const scoAmount = Number(sco.amount);

        const isApproved = sco.status.name === 'APPROVED';
        const afterApproval = isApproved ? currentCommitment : currentCommitment + scoAmount;

        const percentOfPO = poTotal !== 0 ? (Math.abs(scoAmount) / Math.abs(poTotal)) * 100 : 0;

        return {
            ...sco,
            poFinancialImpact: {
                currentCommitment,
                afterApproval,
            },
            percentOfPO,
        };
    },

    updateSCO: async (id: string, data: SCOUpdateRequest) => {
        const sco = await getSCOOrThrow(id);

        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Cannot edit an SCO that is not in DRAFT status');
        }

        // Validate cost code
        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(cc);
        }

        // Validate linked PCO
        if (data.linkedPCOId) {
            const pco = await prisma.primeChangeOrder.findUnique({
                where: { id: data.linkedPCOId },
            });
            if (!pco) throw new NotFoundError('Linked PCO not found');
        }

        // Resolve changeType to ID if provided as enum name
        const updateData: Record<string, unknown> = { ...data };
        if (data.changeType !== undefined) {
            if (data.changeType === null) {
                updateData.changeTypeId = null;
            } else {
                const ct = await prisma.sCOChangeType.findFirst({
                    where: { name: data.changeType },
                });
                if (ct) updateData.changeTypeId = ct.id;
            }
            delete updateData.changeType;
        }

        return await prisma.purchaseOrderCO.update({
            where: { id },
            data: updateData,
            include: scoDetailInclude,
        });
    },

    deleteSCO: async (id: string) => {
        const sco = await getSCOOrThrow(id);

        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Cannot delete an SCO that is not in DRAFT status');
        }

        const now = new Date();
        await prisma.$transaction([
            prisma.purchaseOrderCOLineItem.updateMany({
                where: { pcoId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.purchaseOrderCO.update({
                where: { id },
                data: { deletedAt: now },
            }),
        ]);
    },

    // --- Line Items (BE-SCO-03) ---

    addLineItem: async (scoId: string, data: SCOLineItemCreateRequest) => {
        const sco = await getSCOOrThrow(scoId);
        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only add line items to DRAFT SCOs');
        }

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(cc);
        }

        if (data.poLineItemId) {
            const poli = await prisma.purchaseOrderLineItem.findFirst({
                where: {
                    id: data.poLineItemId,
                    purchaseOrderId: sco.purchaseOrderId,
                    deletedAt: null,
                },
            });
            if (!poli) throw new BadRequestError('PO line item not found on this PO');
        }

        return await prisma.$transaction(async (tx) => {
            const maxLine = await tx.purchaseOrderCOLineItem.aggregate({
                where: { pcoId: scoId, deletedAt: null },
                _max: { lineNumber: true },
            });

            const lineItem = await tx.purchaseOrderCOLineItem.create({
                data: {
                    id: ulid(),
                    pcoId: scoId,
                    lineNumber: (maxLine._max.lineNumber || 0) + 1,
                    description: data.description,
                    quantity: data.qty,
                    unit: data.unit,
                    unitPrice: data.unitPrice,
                    amount: data.qty * data.unitPrice,
                    costCodeId: data.costCodeId,
                    costCategory: data.costCategory,
                    poLineItemId: data.poLineItemId,
                    notes: data.notes,
                },
            });

            // Warn if line items sum doesn't match SCO amount
            const allItems = await tx.purchaseOrderCOLineItem.findMany({
                where: { pcoId: scoId, deletedAt: null },
            });
            const lineItemsSum = allItems.reduce(
                (sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0),
                0
            );
            const amountMismatch =
                Math.abs(Number(sco.amount) - lineItemsSum) > 0.01
                    ? `Line items total (${lineItemsSum.toFixed(2)}) differs from SCO amount (${Number(sco.amount).toFixed(2)})`
                    : null;

            return { lineItem, amountMismatch };
        });
    },

    updateLineItem: async (scoId: string, lineItemId: string, data: SCOLineItemUpdateRequest) => {
        const sco = await getSCOOrThrow(scoId);
        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only update line items on DRAFT SCOs');
        }

        const lineItem = await prisma.purchaseOrderCOLineItem.findFirst({
            where: { id: lineItemId, pcoId: scoId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        if (data.costCodeId) {
            const cc = await prisma.costCode.findUnique({ where: { id: data.costCodeId } });
            if (!cc) throw new BadRequestError('Invalid cost code');
            checkDeletedAt(cc);
        }

        return await prisma.$transaction(async (tx) => {
            const qty = data.qty ?? Number(lineItem.quantity);
            const price = data.unitPrice ?? Number(lineItem.unitPrice);
            const amount = qty * price;

            const updated = await tx.purchaseOrderCOLineItem.update({
                where: { id: lineItemId },
                data: {
                    ...data,
                    quantity: data.qty,
                    unitPrice: data.unitPrice,
                    amount,
                },
            });

            // Check mismatch
            const allItems = await tx.purchaseOrderCOLineItem.findMany({
                where: { pcoId: scoId, deletedAt: null },
            });
            const lineItemsSum = allItems.reduce(
                (sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0),
                0
            );
            const amountMismatch =
                Math.abs(Number(sco.amount) - lineItemsSum) > 0.01
                    ? `Line items total (${lineItemsSum.toFixed(2)}) differs from SCO amount (${Number(sco.amount).toFixed(2)})`
                    : null;

            return { lineItem: updated, amountMismatch };
        });
    },

    removeLineItem: async (scoId: string, lineItemId: string) => {
        const sco = await getSCOOrThrow(scoId);
        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Can only remove line items from DRAFT SCOs');
        }

        const lineItem = await prisma.purchaseOrderCOLineItem.findFirst({
            where: { id: lineItemId, pcoId: scoId, deletedAt: null },
        });
        if (!lineItem) throw new NotFoundError('Line item not found');

        const count = await prisma.purchaseOrderCOLineItem.count({
            where: { pcoId: scoId, deletedAt: null },
        });
        if (count <= 1) {
            throw new BadRequestError('SCO must have at least one line item');
        }

        await prisma.purchaseOrderCOLineItem.delete({ where: { id: lineItemId } });
    },

    // --- Workflow (BE-SCO-04) ---

    approveSCO: async (id: string, userId: string) => {
        const sco = await getSCOOrThrow(id);

        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be approved');
        }

        // Segregation of duties
        if (userId === sco.createdBy) {
            throw new BadRequestError('Creator cannot approve their own SCO');
        }

        // Negative amount validation
        const po = await prisma.purchaseOrder.findUniqueOrThrow({
            where: { id: sco.purchaseOrderId },
            include: { status: { select: { name: true } } },
        });
        const scoAmount = Number(sco.amount);
        if (scoAmount < 0) {
            const newCommitment = Number(po.totalCommitment) + scoAmount;
            if (newCommitment < 0) {
                throw new BadRequestError('SCO would make PO total commitment negative');
            }
        }

        const approvedStatus = await getStatusByName('APPROVED');
        const previousCommitment = Number(po.totalCommitment);

        return await prisma.$transaction(async (tx) => {
            // Update SCO status
            await tx.purchaseOrderCO.update({
                where: { id },
                data: {
                    statusId: approvedStatus.id,
                    approvedBy: userId,
                    approvedAt: new Date(),
                },
            });

            // Log status history
            await tx.sCOStatusHistory.create({
                data: {
                    id: ulid(),
                    scoId: id,
                    fromStatusId: sco.statusId,
                    toStatusId: approvedStatus.id,
                    changedBy: userId,
                },
            });

            // Recalculate PO commitment
            const commitmentResult = await recalcPOCommitment(sco.purchaseOrderId, tx);

            // Schedule entry if impact
            if (sco.scheduleImpactDays && sco.scheduleImpactDays > 0) {
                await tx.projectScheduleEntry.create({
                    data: {
                        id: ulid(),
                        projectId: sco.projectId,
                        date: new Date(),
                        description: `SCO #${sco.scoNumber}: +${sco.scheduleImpactDays} days`,
                    },
                });
            }

            const updatedSCO = await tx.purchaseOrderCO.findUniqueOrThrow({
                where: { id },
                include: scoDetailInclude,
            });

            return {
                sco: updatedSCO,
                poImpact: {
                    previousCommitment,
                    scoAmount,
                    newCommitment:
                        commitmentResult?.newCommitment ?? previousCommitment + scoAmount,
                },
            };
        });
    },

    rejectSCO: async (id: string, data: RejectRequest, userId: string) => {
        const sco = await getSCOOrThrow(id);

        if (sco.status.name !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be rejected');
        }

        const rejectedStatus = await getStatusByName('REJECTED');

        await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderCO.update({
                where: { id },
                data: {
                    statusId: rejectedStatus.id,
                    rejectedBy: userId,
                    rejectedAt: new Date(),
                    rejectionReason: data.reason,
                },
            });

            await tx.sCOStatusHistory.create({
                data: {
                    id: ulid(),
                    scoId: id,
                    fromStatusId: sco.statusId,
                    toStatusId: rejectedStatus.id,
                    changedBy: userId,
                    reason: data.reason,
                },
            });
        });

        return await prisma.purchaseOrderCO.findUniqueOrThrow({
            where: { id },
            include: scoDetailInclude,
        });
    },

    voidSCO: async (id: string, data: VoidRequest, userId: string) => {
        const sco = await getSCOOrThrow(id);

        if (sco.status.name === 'VOID') {
            throw new BadRequestError('SCO is already voided');
        }

        const wasApproved = sco.status.name === 'APPROVED';

        // If voiding an approved SCO, check for invoices
        if (wasApproved) {
            const invoiceCount = await prisma.invoice.count({
                where: {
                    purchaseOrderId: sco.purchaseOrderId,
                    deletedAt: null,
                    createdAt: { gte: sco.approvedAt || sco.createdAt },
                },
            });
            if (invoiceCount > 0) {
                throw new BadRequestError(
                    'Cannot void an approved SCO with related invoices. Create a reversal SCO instead.'
                );
            }
        }

        const voidStatus = await getStatusByName('VOID');

        return await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderCO.update({
                where: { id },
                data: {
                    statusId: voidStatus.id,
                    voidedBy: userId,
                    voidedAt: new Date(),
                    voidReason: data.reason,
                },
            });

            await tx.sCOStatusHistory.create({
                data: {
                    id: ulid(),
                    scoId: id,
                    fromStatusId: sco.statusId,
                    toStatusId: voidStatus.id,
                    changedBy: userId,
                    reason: data.reason,
                },
            });

            // If voiding an approved SCO, reverse financial impact
            if (wasApproved) {
                await recalcPOCommitment(sco.purchaseOrderId, tx);
            }

            return await tx.purchaseOrderCO.findUniqueOrThrow({
                where: { id },
                include: scoDetailInclude,
            });
        });
    },

    // --- Summary & KPIs (BE-SCO-05) ---

    getProjectSCOSummary: async (projectId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const allSCOs = await prisma.purchaseOrderCO.findMany({
            where: { projectId, deletedAt: null },
            include: {
                status: { select: { name: true } },
                lineItems: {
                    where: { deletedAt: null },
                    select: { amount: true, costCategory: true },
                },
            },
        });

        const byStatus: Record<string, { count: number; totalAmount: number }> = {
            draft: { count: 0, totalAmount: 0 },
            approved: { count: 0, totalAmount: 0 },
            rejected: { count: 0, totalAmount: 0 },
            void: { count: 0, totalAmount: 0 },
        };

        const statusNameToKey: Record<string, string> = {
            DRAFT: 'draft',
            APPROVED: 'approved',
            REJECTED: 'rejected',
            VOID: 'void',
        };

        const byInitiatedBy = {
            vendor: { count: 0, totalAmount: 0 },
            firm: { count: 0, totalAmount: 0 },
        };

        const byCostCategory: Record<string, number> = {
            materials: 0,
            labor: 0,
            equipment: 0,
            subcontractor: 0,
            other: 0,
        };

        const costCategoryToKey: Record<string, string> = {
            MATERIALS: 'materials',
            LABOR: 'labor',
            EQUIPMENT: 'equipment',
            SUBCONTRACTOR: 'subcontractor',
            OTHER: 'other',
        };

        let totalApprovedAmount = 0;
        let totalPendingAmount = 0;

        for (const sco of allSCOs) {
            const amount = Number(sco.amount);
            const statusKey = statusNameToKey[sco.status.name];

            if (statusKey && byStatus[statusKey]) {
                byStatus[statusKey].count++;
                byStatus[statusKey].totalAmount += amount;
            }

            const initiatedKey = sco.initiatedBy === 'VENDOR' ? 'vendor' : 'firm';
            byInitiatedBy[initiatedKey].count++;
            byInitiatedBy[initiatedKey].totalAmount += amount;

            if (sco.status.name === 'APPROVED') {
                totalApprovedAmount += amount;

                // Cost category breakdown from approved SCO line items
                for (const li of sco.lineItems) {
                    if (li.costCategory) {
                        const catKey = costCategoryToKey[li.costCategory];
                        if (catKey) {
                            byCostCategory[catKey] += Number(li.amount || 0);
                        }
                    }
                }
            }

            if (sco.status.name === 'DRAFT') {
                totalPendingAmount += amount;
            }
        }

        return {
            totalCount: allSCOs.length,
            totalApprovedAmount,
            totalPendingAmount,
            byStatus,
            byInitiatedBy,
            byCostCategory,
            netMarginImpact: totalApprovedAmount,
        };
    },

    listPendingSCOs: async (params: PaginationParams) => {
        const { skip, take } = params;

        const whereClause = {
            status: { name: 'DRAFT' },
            deletedAt: null,
        };

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrderCO.count({ where: whereClause }),
            prisma.purchaseOrderCO.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: [{ priority: 'desc' }, { date: 'asc' }],
                select: {
                    id: true,
                    scoNumber: true,
                    title: true,
                    amount: true,
                    priority: true,
                    date: true,
                    createdBy: true,
                    purchaseOrder: { select: { poNumber: true } },
                    project: { select: { id: true, name: true } },
                    vendor: { select: { name: true } },
                },
            }),
        ]);

        const enriched = data.map((sco) => ({
            ...sco,
            daysPending: Math.floor((Date.now() - sco.date.getTime()) / (1000 * 60 * 60 * 24)),
        }));

        return { data: enriched, count };
    },

    // --- Margin Comparison (BE-SCO-06) ---

    getMarginComparison: async (id: string) => {
        const sco = await prisma.purchaseOrderCO.findUnique({
            where: { id },
            include: { status: { select: { name: true } } },
        });
        if (!sco) throw new NotFoundError('Change order not found');
        checkDeletedAt(sco);

        if (!sco.linkedPCOId) {
            throw new BadRequestError('SCO is not linked to a PCO');
        }

        const pco = await prisma.primeChangeOrder.findUniqueOrThrow({
            where: { id: sco.linkedPCOId },
            select: {
                pcoNumber: true,
                title: true,
                amount: true,
                estimatedCost: true,
                estimatedMargin: true,
                estimatedMarginPercent: true,
            },
        });

        // Get all approved SCOs linked to this PCO
        const approvedStatus = await prisma.changeOrderStatus.findFirst({
            where: { name: 'APPROVED' },
        });

        const linkedSCOs = await prisma.purchaseOrderCO.findMany({
            where: {
                linkedPCOId: sco.linkedPCOId,
                deletedAt: null,
                ...(approvedStatus && { statusId: approvedStatus.id }),
            },
            select: {
                scoNumber: true,
                title: true,
                amount: true,
                status: { select: { name: true } },
            },
        });

        const pcoAmount = Number(pco.amount);
        const actualCost = linkedSCOs.reduce((sum, s) => sum + Number(s.amount), 0);
        const actualMargin = pcoAmount - actualCost;
        const actualMarginPercent = pcoAmount !== 0 ? (actualMargin / pcoAmount) * 100 : 0;
        const estimatedMargin = Number(pco.estimatedMargin || 0);
        const estimatedMarginPercent = Number(pco.estimatedMarginPercent || 0);

        return {
            pco: {
                pcoNumber: pco.pcoNumber,
                title: pco.title,
                amount: pcoAmount,
                estimatedCost: Number(pco.estimatedCost || 0),
                estimatedMargin,
                estimatedMarginPercent,
            },
            scos: linkedSCOs.map((s) => ({
                scoNumber: s.scoNumber,
                title: s.title,
                amount: Number(s.amount),
                status: s.status.name,
            })),
            actualCost,
            actualMargin,
            actualMarginPercent,
            marginVariance: actualMargin - estimatedMargin,
            marginVariancePercent: actualMarginPercent - estimatedMarginPercent,
        };
    },
};
