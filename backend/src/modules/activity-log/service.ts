import { ActivityLog, Prisma } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ForbiddenError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import {
    buildFieldDiffActivityDetails,
    buildFieldUpdateActivityDescription,
    type ActivityChange,
    type ActivitySubject,
} from './description';
import { ActivityAction, ActivityEntityType } from './types';

type LogParams = {
    userId: string;
    entityType: ActivityEntityType;
    entityId: string;
    action: ActivityAction;
    description: string;
    note?: string | null;
    revision?: number | null;
    details?: Prisma.InputJsonValue | null;
    affectedEntityIds?: string[];
    tx?: TransactionClient;
};

type FieldUpdateLogParams = {
    userId: string;
    entityType: ActivityEntityType;
    entityId: string;
    subject: ActivitySubject;
    changes: Array<ActivityChange | null | undefined>;
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

type ActivityLogWithUser = Prisma.ActivityLogGetPayload<{ include: typeof includeUser }>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function lockActivityRevisionSequence(
    client: TransactionClient,
    entityType: ActivityEntityType,
    entityId: string
): Promise<void> {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${entityType}), hashtext(${entityId}))`;
}

async function getNextActivityRevision(
    client: TransactionClient,
    entityType: ActivityEntityType,
    entityId: string
): Promise<number> {
    const latest = await client.activityLog.findFirst({
        where: {
            entityType,
            entityId,
            action: 'update',
            revision: { not: null },
        },
        orderBy: { revision: 'desc' },
        select: { revision: true },
    });

    return (latest?.revision ?? 0) + 1;
}

async function createFieldUpdateLog(
    client: TransactionClient,
    params: Omit<FieldUpdateLogParams, 'tx'>
): Promise<ActivityLog | null> {
    const changes = params.changes.filter((change): change is ActivityChange => Boolean(change));
    if (changes.length === 0) return null;

    await lockActivityRevisionSequence(client, params.entityType, params.entityId);
    const revision = await getNextActivityRevision(client, params.entityType, params.entityId);
    const details = buildFieldDiffActivityDetails(params.subject, revision, changes);

    return client.activityLog.create({
        data: {
            id: generateNanoId(),
            userId: params.userId,
            entityType: params.entityType,
            entityId: params.entityId,
            action: 'update',
            description: buildFieldUpdateActivityDescription(params.subject, revision),
            note: params.note ?? null,
            revision,
            details: toJsonValue(details),
            affectedEntityIds: params.affectedEntityIds ?? [],
        },
    });
}

type OwnCommentForMutation = {
    id: string;
    userId: string;
    entityType: ActivityEntityType;
    entityId: string;
};

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

async function getOwnCommentForMutation(
    commentId: string,
    userId: string
): Promise<OwnCommentForMutation> {
    const comment = await prisma.activityLog.findUnique({
        where: { id: commentId },
        select: {
            id: true,
            userId: true,
            entityType: true,
            entityId: true,
            action: true,
            deletedAt: true,
        },
    });

    if (!comment || comment.action !== 'comment' || comment.deletedAt) {
        throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
        throw new ForbiddenError('Only the comment author can modify this comment');
    }

    return {
        id: comment.id,
        userId: comment.userId,
        entityType: comment.entityType as ActivityEntityType,
        entityId: comment.entityId,
    };
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
                revision: rest.revision ?? null,
                details: rest.details ?? undefined,
                affectedEntityIds: rest.affectedEntityIds ?? [],
            },
        });
    },

    logFieldUpdate: async (params: FieldUpdateLogParams): Promise<ActivityLog | null> => {
        const { tx, ...rest } = params;
        if (tx) return createFieldUpdateLog(tx, rest);

        return prisma.$transaction((transaction) => createFieldUpdateLog(transaction, rest));
    },

    createComment: async (params: {
        userId: string;
        entityType: ActivityEntityType;
        entityId: string;
        note: string;
    }): Promise<ActivityLogWithUser> => {
        return prisma.activityLog.create({
            data: {
                id: generateNanoId(),
                userId: params.userId,
                entityType: params.entityType,
                entityId: params.entityId,
                action: 'comment',
                description: 'left a comment',
                note: params.note,
                affectedEntityIds: [],
            },
            include: includeUser,
        });
    },

    getOwnCommentForMutation,

    updateComment: async (commentId: string, note: string): Promise<ActivityLogWithUser> => {
        return prisma.activityLog.update({
            where: { id: commentId },
            data: {
                note,
                editedAt: new Date(),
            },
            include: includeUser,
        });
    },

    deleteComment: async (commentId: string, userId: string): Promise<ActivityLogWithUser> => {
        return prisma.activityLog.update({
            where: { id: commentId },
            data: {
                deletedAt: new Date(),
                deletedBy: userId,
            },
            include: includeUser,
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
            deletedAt: null,
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
            deletedAt: null,
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
            deletedAt: null,
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
