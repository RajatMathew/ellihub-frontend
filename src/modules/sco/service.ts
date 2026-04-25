import { Prisma, SCOAttachment, SubChangeOrder } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddScoAttachmentRequest,
    RemoveScoAttachmentRequest,
    ScoCreateRequest,
    ScoUpdateRequest,
    SetScoApprovedRequest,
    SetScoDraftRequest,
    SetScoRejectedRequest,
    SetScoVoidRequest,
} from './models';
import { generateScoNumber } from './utils';

export const ScoService = {
    getScosByPo: async (purchaseOrderId: string) => {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        return await prisma.subChangeOrder.findMany({
            where: { purchaseOrderId, deletedAt: null },
            orderBy: { date: 'desc' },
            include: { changeType: true },
        });
    },

    getSco: async (id: string): Promise<SubChangeOrder> => {
        const sco = await prisma.subChangeOrder.findUnique({
            where: { id },
            include: {
                project: true,
                purchaseOrder: true,
                changeType: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { sequenceNumber: 'asc' },
                    include: { unit: true, category: true },
                },
                attachments: { include: { document: true } },
            },
        });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        return sco;
    },

    getScos: async (
        params: PaginationParams
    ): Promise<{ data: SubChangeOrder[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, purchaseOrderId, status, changeTypeId, ...restFilter } = filter || {};

        const whereClause: Prisma.SubChangeOrderWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(purchaseOrderId && { purchaseOrderId }),
            ...(status && { status }),
            ...(changeTypeId && { changeTypeId }),
            ...(search && {
                OR: [
                    { scoNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.subChangeOrder.count({ where: whereClause }),
            prisma.subChangeOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof SubChangeOrder]: sortOrder },
                include: { project: true, purchaseOrder: true, changeType: true },
            }),
        ]);

        return { data, count };
    },

    createSco: async (request: ScoCreateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            projectId,
            purchaseOrderId,
            date,
            changeTypeId,
            markupAmount,
            scheduleImpactDays,
            impactsSchedule,
            lineItems,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create an SCO');
        }

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.projectId !== projectId) {
            throw new BadRequestError('Purchase order does not belong to this project');
        }

        if (changeTypeId) {
            const changeType = await prisma.lookup.findUnique({ where: { id: changeTypeId } });
            if (!changeType) throw new NotFoundError('Change type not found');
        }

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const categoryIds = [...new Set(lineItems.map((li) => li.categoryId))];
        const lookupIds = [...new Set([...unitIds, ...categoryIds])];
        const lookups = await prisma.lookup.findMany({ where: { id: { in: lookupIds } } });
        const lookupSet = new Set(lookups.map((l) => l.id));
        if (unitIds.some((id) => !lookupSet.has(id))) {
            throw new NotFoundError('One or more line item units not found');
        }
        if (categoryIds.some((id) => !lookupSet.has(id))) {
            throw new NotFoundError('One or more line item categories not found');
        }

        const costCodeIds = [
            ...new Set(lineItems.map((li) => li.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        const lineAmounts = lineItems.map((li) =>
            new Prisma.Decimal(li.qty).times(new Prisma.Decimal(li.unitPrice))
        );
        const amount = lineAmounts.reduce((sum, v) => sum.plus(v), new Prisma.Decimal(0));

        return await prisma.$transaction(async (tx) => {
            const scoNumber = await generateScoNumber(tx, project.jobNumber!);

            const sco = await tx.subChangeOrder.create({
                data: {
                    ...rest,
                    id: ulid(),
                    scoNumber,
                    projectId,
                    purchaseOrderId,
                    date: new Date(date),
                    status: 'DRAFT',
                    amount,
                    markupAmount: markupAmount ?? null,
                    scheduleImpactDays: scheduleImpactDays ?? null,
                    changeTypeId: changeTypeId ?? null,
                    impactsSchedule: impactsSchedule ?? false,
                    createdBy: userId,
                },
            });

            await tx.subCOLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: ulid(),
                    subCoId: sco.id,
                    sequenceNumber: i + 1,
                    description: li.description ?? null,
                    qty: li.qty,
                    unitId: li.unitId,
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    categoryId: li.categoryId,
                    costCodeId: li.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'subChangeOrder',
                entityId: sco.id,
                action: 'create',
                description: `Created SCO ${sco.scoNumber} on project ${project.name}`,
                affectedEntityIds: [projectId],
                tx,
            });

            return sco;
        });
    },

    updateSco: async (request: ScoUpdateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            id,
            projectId,
            purchaseOrderId,
            date,
            changeTypeId,
            markupAmount,
            scheduleImpactDays,
            impactsSchedule,
            lineItems,
            ...rest
        } = request;

        const existing = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(existing);
        if (existing.status !== 'DRAFT') {
            throw new BadRequestError('SCO can only be updated while in DRAFT');
        }
        if (existing.projectId !== projectId) {
            throw new BadRequestError('SCO project cannot be changed');
        }

        if (existing.purchaseOrderId !== purchaseOrderId) {
            const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
            if (!po) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(po);
            if (po.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to this project');
            }
        }

        if (changeTypeId) {
            const changeType = await prisma.lookup.findUnique({ where: { id: changeTypeId } });
            if (!changeType) throw new NotFoundError('Change type not found');
        }

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const categoryIds = [...new Set(lineItems.map((li) => li.categoryId))];
        const lookupIds = [...new Set([...unitIds, ...categoryIds])];
        const lookups = await prisma.lookup.findMany({ where: { id: { in: lookupIds } } });
        const lookupSet = new Set(lookups.map((l) => l.id));
        if (unitIds.some((uid) => !lookupSet.has(uid))) {
            throw new NotFoundError('One or more line item units not found');
        }
        if (categoryIds.some((cid) => !lookupSet.has(cid))) {
            throw new NotFoundError('One or more line item categories not found');
        }

        const costCodeIds = [
            ...new Set(lineItems.map((li) => li.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        const lineAmounts = lineItems.map((li) =>
            new Prisma.Decimal(li.qty).times(new Prisma.Decimal(li.unitPrice))
        );
        const amount = lineAmounts.reduce((sum, v) => sum.plus(v), new Prisma.Decimal(0));

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.subChangeOrder.update({
                where: { id },
                data: {
                    ...rest,
                    purchaseOrderId,
                    date: new Date(date),
                    amount,
                    markupAmount: markupAmount ?? null,
                    scheduleImpactDays: scheduleImpactDays ?? null,
                    changeTypeId: changeTypeId ?? null,
                    impactsSchedule: impactsSchedule ?? false,
                },
            });

            await tx.subCOLineItem.deleteMany({ where: { subCoId: id } });
            await tx.subCOLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: ulid(),
                    subCoId: id,
                    sequenceNumber: i + 1,
                    description: li.description ?? null,
                    qty: li.qty,
                    unitId: li.unitId,
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    categoryId: li.categoryId,
                    costCodeId: li.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'subChangeOrder',
                entityId: id,
                action: 'update',
                description: `Updated SCO ${updated.scoNumber}`,
                affectedEntityIds: [projectId],
                tx,
            });

            return updated;
        });
    },

    addAttachment: async (
        request: AddScoAttachmentRequest,
        userId: string
    ): Promise<SCOAttachment> => {
        const { scoId, documentId } = request;

        const sco = await prisma.subChangeOrder.findUnique({ where: { id: scoId } });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while SCO is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(sco.projectId, 'PRIME_CO', tx);
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.sCOAttachment.create({
                data: { id: ulid(), scoId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'subChangeOrder',
                entityId: scoId,
                action: 'link',
                description: `Attached file ${file.name} to SCO ${sco.scoNumber}`,
                affectedEntityIds: [documentId, sco.projectId],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (
        request: RemoveScoAttachmentRequest,
        userId: string
    ): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.sCOAttachment.findUnique({
            where: { id },
            include: { sco: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        checkDeletedAt(attachment.sco);
        if (attachment.sco.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while SCO is in DRAFT');
        }

        await prisma.sCOAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: attachment.scoId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from SCO ${attachment.sco.scoNumber}`,
            affectedEntityIds: [attachment.documentId, attachment.sco.projectId],
        });
    },

    setDraft: async (request: SetScoDraftRequest, userId: string): Promise<SubChangeOrder> => {
        const { id } = request;
        const sco = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status === 'DRAFT') {
            throw new BadRequestError('SCO is already in DRAFT');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: {
                status: 'DRAFT',
                approvedBy: null,
                approvedAt: null,
                rejectedBy: null,
                rejectedAt: null,
                rejectionReason: null,
                voidedBy: null,
                voidedAt: null,
                voidReason: null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Set SCO ${updated.scoNumber} to DRAFT`,
            affectedEntityIds: [sco.projectId],
        });

        return updated;
    },

    setApproved: async (
        request: SetScoApprovedRequest,
        userId: string
    ): Promise<SubChangeOrder> => {
        const { id } = request;
        const sco = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be approved');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Approved SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId],
        });

        return updated;
    },

    setRejected: async (
        request: SetScoRejectedRequest,
        userId: string
    ): Promise<SubChangeOrder> => {
        const { id, rejectionReason } = request;
        const sco = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT SCOs can be rejected');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Rejected SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId],
        });

        return updated;
    },

    setVoid: async (request: SetScoVoidRequest, userId: string): Promise<SubChangeOrder> => {
        const { id, voidReason } = request;
        const sco = await prisma.subChangeOrder.findUnique({ where: { id } });
        if (!sco) throw new NotFoundError('Sub change order not found');
        checkDeletedAt(sco);
        if (sco.status === 'VOID') {
            throw new BadRequestError('SCO is already void');
        }
        if (sco.status !== 'APPROVED') {
            throw new BadRequestError('Only APPROVED SCOs can be voided');
        }

        const updated = await prisma.subChangeOrder.update({
            where: { id },
            data: {
                status: 'VOID',
                voidedBy: userId,
                voidedAt: new Date(),
                voidReason,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'subChangeOrder',
            entityId: id,
            action: 'update',
            description: `Voided SCO ${updated.scoNumber}`,
            affectedEntityIds: [sco.projectId],
        });

        return updated;
    },
};
