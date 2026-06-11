import { ActivityLog, Prisma } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import { ActivityAction, ActivityEntityType } from './types';

type LogParams = {
    userId: string;
    entityType: ActivityEntityType;
    entityId: string;
    action: ActivityAction;
    description: string;
    note?: string | null;
    affectedEntityIds?: string[];
    tx?: TransactionClient;
};

type ListFilter = {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    search?: string;
};

const includeUser = {
    user: { select: { id: true, name: true, email: true, image: true } },
} as const;

async function getRelatedActivityEntityIds(
    entityType: ActivityEntityType,
    entityId: string
): Promise<string[]> {
    if (entityType !== 'vendor') return [];

    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { vendorId: entityId, deletedAt: null },
        select: { id: true },
    });

    return purchaseOrders.map((purchaseOrder) => purchaseOrder.id);
}

export const ActivityLogService = {
    log: async (params: LogParams): Promise<ActivityLog> => {
        const { tx, ...rest } = params;
        const client = tx ?? prisma;
        return client.activityLog.create({
            data: {
                id: generateNanoId(),
                userId: rest.userId,
                entityType: rest.entityType,
                entityId: rest.entityId,
                action: rest.action,
                description: rest.description,
                note: rest.note ?? null,
                affectedEntityIds: rest.affectedEntityIds ?? [],
            },
        });
    },

    getForEntity: async (
        entityType: ActivityEntityType,
        entityId: string,
        pagination: PaginationParams
    ): Promise<{ data: ActivityLog[]; count: number }> => {
        const { skip, take } = pagination;
        const affectedEntityIds = [
            entityId,
            ...(await getRelatedActivityEntityIds(entityType, entityId)),
        ];
        const where: Prisma.ActivityLogWhereInput = {
            OR: [{ entityType, entityId }, { affectedEntityIds: { hasSome: affectedEntityIds } }],
        };

        const [count, data] = await prisma.$transaction([
            prisma.activityLog.count({ where }),
            prisma.activityLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: includeUser,
            }),
        ]);

        return { data, count };
    },

    getForEmployee: async (
        employeeId: string,
        pagination: PaginationParams
    ): Promise<{ data: ActivityLog[]; count: number }> => {
        const { skip, take } = pagination;
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { userId: true, deletedAt: true },
        });
        if (!employee || employee.deletedAt) throw new NotFoundError('Employee not found');

        const where: Prisma.ActivityLogWhereInput = {
            OR: [
                { entityType: 'employee', entityId: employeeId },
                { affectedEntityIds: { has: employeeId } },
                ...(employee.userId ? [{ userId: employee.userId }] : []),
            ],
        };

        const [count, data] = await prisma.$transaction([
            prisma.activityLog.count({ where }),
            prisma.activityLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: includeUser,
            }),
        ]);

        return { data, count };
    },

    list: async (
        pagination: PaginationParams,
        filter: ListFilter = {}
    ): Promise<{ data: ActivityLog[]; count: number }> => {
        const { skip, take } = pagination;
        const { userId, entityType, entityId, action, from, to, search } = filter;

        const where: Prisma.ActivityLogWhereInput = {
            ...(userId && { userId }),
            ...(entityType && { entityType }),
            ...(entityId && {
                OR: [{ entityId }, { affectedEntityIds: { has: entityId } }],
            }),
            ...(action && { action }),
            ...(search && {
                AND: [
                    {
                        OR: [
                            { description: { contains: search, mode: 'insensitive' } },
                            { note: { contains: search, mode: 'insensitive' } },
                            { entityId: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                ],
            }),
            ...((from || to) && {
                createdAt: {
                    ...(from && { gte: from }),
                    ...(to && { lte: to }),
                },
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.activityLog.count({ where }),
            prisma.activityLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: includeUser,
            }),
        ]);

        return { data, count };
    },
};
