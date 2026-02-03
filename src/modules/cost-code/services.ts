import { CostCode, CostCodeCategory } from '@db/client';
import { prisma } from '@lib/prisma';
import { IPaginatedResponse, PaginationParams } from '@middleware';
import { checkDeletedAt, getPaginatedResponse } from '@modules/common/utils';
import { ulid } from 'ulid';
import z from 'zod';

import {
    CostCodeCategoryCreateRequest,
    CostCodeCategoryCreateSchema,
    CostCodeCategoryUpdateRequest,
    CostCodeCategoryUpdateSchema,
    CostCodeCreateRequest,
    CostCodeCreateSchema,
    CostCodeUpdateRequest,
    CostCodeUpdateSchema,
} from './models';

export const CostCodeService = {
    createCostCodeCategory: async (
        request: CostCodeCategoryCreateRequest
    ): Promise<CostCodeCategory> => {
        z.parse(CostCodeCategoryCreateSchema, request);

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
        z.parse(CostCodeCategoryUpdateSchema, request);

        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id: request.id },
        });

        checkDeletedAt(costCodeCategory);

        return await prisma.costCodeCategory.create({
            data: {
                ...request,
                id: ulid(),
            },
        });
    },

    getCostCodeCategories: async (): Promise<CostCodeCategory[]> => {
        return await prisma.costCodeCategory.findMany();
    },

    deleteCostCodeCategory: async (id: string): Promise<void> => {
        z.parse(z.ulid(), id);

        await prisma.costCodeCategory.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    },

    createCostCode: async (request: CostCodeCreateRequest): Promise<CostCode> => {
        z.parse(CostCodeCreateSchema, request);

        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id: request.costCodeCategoryId },
        });

        checkDeletedAt(costCodeCategory);

        return await prisma.costCode.create({
            data: {
                ...request,
                id: ulid(),
            },
        });
    },

    updateCostCode: async (request: CostCodeUpdateRequest): Promise<CostCode> => {
        z.parse(CostCodeUpdateSchema, request);

        const costCodeCategory = await prisma.costCodeCategory.findUnique({
            where: { id: request.costCodeCategoryId },
        });

        const costCode = await prisma.costCode.findUnique({
            where: { id: request.id },
        });

        checkDeletedAt(costCodeCategory);
        checkDeletedAt(costCode);

        return await prisma.costCode.update({
            where: { id: request.id },
            data: {
                ...request,
            },
        });
    },

    getCostCodes: async (params: PaginationParams): Promise<IPaginatedResponse<CostCode>> => {
        const { filter, skip, take, sortBy, sortOrder } = params;
        const { search, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { code: { contains: search, mode: 'insensitive' as const } },
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

        return getPaginatedResponse(data, count, params);
    },

    deleteCostCode: async (id: string): Promise<void> => {
        z.parse(z.ulid(), id);

        await prisma.costCode.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    },
};
