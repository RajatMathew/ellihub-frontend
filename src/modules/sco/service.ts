import { Prisma, SubChangeOrder } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { ScoCreateRequest, ScoUpdateRequest } from './models';
import { generateScoNumber } from './utils';

export const ScoService = {
    createSco: async (request: ScoCreateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            projectId,
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
                tx,
            });

            return sco;
        });
    },

    updateSco: async (request: ScoUpdateRequest, userId: string): Promise<SubChangeOrder> => {
        const {
            id,
            projectId,
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
                tx,
            });

            return updated;
        });
    },
};
