import { ActivityLog } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ulid } from 'ulid';

import { ActivityAction, ActivityEntityType } from './types';

type LogParams = {
    userId: string;
    entityType: ActivityEntityType;
    entityId: string;
    action: ActivityAction;
    description: string;
    note?: string | null;
    tx?: TransactionClient;
};

type ListFilter = {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
};

const includeUser = {
    user: { select: { id: true, name: true, email: true, image: true } },
} as const;

export const ActivityLogService = {
    log: async (params: LogParams): Promise<ActivityLog> => {
        const { tx, ...rest } = params;
        const client = tx ?? prisma;
        return client.activityLog.create({
            data: {
                id: ulid(),
                userId: rest.userId,
                entityType: rest.entityType,
                entityId: rest.entityId,
                action: rest.action,
                description: rest.description,
                note: rest.note ?? null,
            },
        });
    },

    getForEntity: async (
        entityType: ActivityEntityType,
        entityId: string,
        pagination: PaginationParams
    ): Promise<{ data: ActivityLog[]; count: number }> => {
        const { skip, take } = pagination;
        const where = { entityType, entityId };

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
        const { userId, entityType, entityId, action, from, to } = filter;

        const where = {
            ...(userId && { userId }),
            ...(entityType && { entityType }),
            ...(entityId && { entityId }),
            ...(action && { action }),
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
