import { CostCode, CostCodeCategory } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    CostCodeCategoryCreateRequest,
    CostCodeCategoryUpdateRequest,
    CostCodeCreateRequest,
    CostCodeUpdateRequest,
} from './models';

export const CostCodeService = {
    createCostCodeCategory: async (
        request: CostCodeCategoryCreateRequest,
        userId: string
    ): Promise<CostCodeCategory> => {
        const created = await prisma.costCodeCategory.create({
            data: {
                ...request,
                id: generateNanoId(),
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCodeCategory',
            entityId: created.id,
            action: 'create',
            description: `Created cost code category ${created.name}`,
        });

        return created;
    },

    updateCostCodeCategory: async (
        request: CostCodeCategoryUpdateRequest,
        userId: string
    ): Promise<CostCodeCategory> => {
        const { id, ...data } = request;

        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id },
        });

        if (!costCodeCategory) {
            throw new NotFoundError('Cost code category not found');
        }

        checkDeletedAt(costCodeCategory);

        const updated = await prisma.costCodeCategory.update({
            where: { id },
            data,
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCodeCategory',
            entityId: updated.id,
            action: 'update',
            description: `Updated cost code category ${updated.name}`,
        });

        return updated;
    },

    getCostCodeCategory: async (id: string): Promise<CostCodeCategory> => {
        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id },
        });

        if (!costCodeCategory) {
            throw new NotFoundError('Cost code category not found');
        }

        checkDeletedAt(costCodeCategory);

        return costCodeCategory;
    },

    getCostCodeCategories: async (): Promise<CostCodeCategory[]> => {
        return await prisma.costCodeCategory.findMany({
            where: {
                deletedAt: null,
            },
        });
    },

    deleteCostCodeCategory: async (id: string, userId: string): Promise<void> => {
        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id },
        });

        if (!costCodeCategory) {
            throw new NotFoundError('Cost code category not found');
        }

        checkDeletedAt(costCodeCategory);

        await prisma.costCodeCategory.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCodeCategory',
            entityId: id,
            action: 'delete',
            description: `Deleted cost code category ${costCodeCategory.name}`,
        });
    },

    createCostCode: async (request: CostCodeCreateRequest, userId: string): Promise<CostCode> => {
        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id: request.costCodeCategoryId },
        });

        if (!costCodeCategory) {
            throw new NotFoundError('Cost code category not found');
        }

        checkDeletedAt(costCodeCategory);

        // Check code uniqueness (excluding soft-deleted)
        const existing = await prisma.costCode.findFirst({
            where: {
                code: request.code,
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('A cost code with this code already exists');
        }

        const created = await prisma.costCode.create({
            data: {
                ...request,
                id: generateNanoId(),
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCode',
            entityId: created.id,
            action: 'create',
            description: `Created cost code ${created.code} — ${created.name}`,
            affectedEntityIds: [created.costCodeCategoryId],
        });

        return created;
    },

    updateCostCode: async (request: CostCodeUpdateRequest, userId: string): Promise<CostCode> => {
        const { id, ...data } = request;

        const costCode = await prisma.costCode.findUnique({
            where: { id },
        });

        if (!costCode) {
            throw new NotFoundError('Cost code not found');
        }

        checkDeletedAt(costCode);

        // If costCodeCategoryId is being updated, validate it
        if (data.costCodeCategoryId) {
            const costCodeCategory = await prisma.costCodeCategory.findUnique({
                where: { id: data.costCodeCategoryId },
            });

            if (!costCodeCategory) {
                throw new NotFoundError('Cost code category not found');
            }

            checkDeletedAt(costCodeCategory);
        }

        // Check code uniqueness if code is being updated
        if (data.code) {
            const existing = await prisma.costCode.findFirst({
                where: {
                    code: data.code,
                    deletedAt: null,
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictError('A cost code with this code already exists');
            }
        }

        const updated = await prisma.costCode.update({
            where: { id },
            data,
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCode',
            entityId: updated.id,
            action: 'update',
            description: `Updated cost code ${updated.code} — ${updated.name}`,
            affectedEntityIds: [
                updated.costCodeCategoryId,
                ...(costCode.costCodeCategoryId !== updated.costCodeCategoryId
                    ? [costCode.costCodeCategoryId]
                    : []),
            ],
        });

        return updated;
    },

    getCostCode: async (id: string): Promise<CostCode> => {
        const costCode = await prisma.costCode.findUnique({
            where: { id },
        });

        if (!costCode) {
            throw new NotFoundError('Cost code not found');
        }

        checkDeletedAt(costCode);

        return costCode;
    },

    getCostCodes: async (
        params: PaginationParams
    ): Promise<{
        data: CostCode[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { costCodeCategoryId, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(costCodeCategoryId && { costCodeCategoryId }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { code: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.costCode.count({
                where: whereClause,
            }),

            prisma.costCode.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof CostCode]: sortOrder,
                },
                include: {
                    costCodeCategory: true,
                },
            }),
        ]);

        return { data, count };
    },

    deleteCostCode: async (id: string, userId: string): Promise<void> => {
        const costCode = await prisma.costCode.findUnique({
            where: { id },
        });

        if (!costCode) {
            throw new NotFoundError('Cost code not found');
        }

        checkDeletedAt(costCode);

        await prisma.costCode.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'costCode',
            entityId: id,
            action: 'delete',
            description: `Deleted cost code ${costCode.code} — ${costCode.name}`,
            affectedEntityIds: [costCode.costCodeCategoryId],
        });
    },
};
