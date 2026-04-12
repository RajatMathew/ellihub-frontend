import { CostCode, CostCodeCategory } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    CostCodeCategoryCreateRequest,
    CostCodeCategoryUpdateRequest,
    CostCodeCreateRequest,
    CostCodeUpdateRequest,
} from './models';

export const CostCodeService = {
    createCostCodeCategory: async (
        request: CostCodeCategoryCreateRequest
    ): Promise<CostCodeCategory> => {
        return await prisma.costCodeCategory.create({
            data: {
                ...request,
                id: ulid(),
            },
        });
    },

    updateCostCodeCategory: async (
        request: CostCodeCategoryUpdateRequest
    ): Promise<CostCodeCategory> => {
        const { id, ...data } = request;

        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id },
        });

        if (!costCodeCategory) {
            throw new NotFoundError('Cost code category not found');
        }

        checkDeletedAt(costCodeCategory);

        return await prisma.costCodeCategory.update({
            where: { id },
            data,
        });
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

    deleteCostCodeCategory: async (id: string): Promise<void> => {
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
    },

    createCostCode: async (request: CostCodeCreateRequest): Promise<CostCode> => {
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

        return await prisma.costCode.create({
            data: {
                ...request,
                id: ulid(),
            },
        });
    },

    updateCostCode: async (request: CostCodeUpdateRequest): Promise<CostCode> => {
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

        return await prisma.costCode.update({
            where: { id },
            data,
        });
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
            }),
        ]);

        return { data, count };
    },

    deleteCostCode: async (id: string): Promise<void> => {
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
    },
};
