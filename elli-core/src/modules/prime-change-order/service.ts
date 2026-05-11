import {
    FieldwireProjectUser as CachedFieldwireProjectUser,
    PrimeChangeOrder,
    Prisma,
} from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';
import { ZodError } from 'zod';

import { FieldwireClient, getFieldwireErrorMessage } from './fieldwire-client';
import {
    FieldwireChangeOrder,
    FieldwireProjectUser as FieldwireProjectUserResponse,
} from './models';

type SyncTrigger = 'MANUAL' | 'SCHEDULED';

type SyncCounts = {
    totalReceived: number;
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
};

type SyncResult = {
    summary: SyncCounts & {
        projectId: string;
        fieldwireProjectId: string;
        status: 'SUCCESS';
        syncedAt: Date;
    };
    data: PrimeChangeOrderWithAssignee[];
};

type PrimeChangeOrderAssignee = {
    fieldwireUserId: number;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    jobTitle: string | null;
    photoUrl: string | null;
    role: string | null;
    userDeletedAt: Date | null;
};

type PrimeChangeOrderWithAssignee = PrimeChangeOrder & {
    assignee: PrimeChangeOrderAssignee | null;
};

type FieldwireMappingCleanupClient = Pick<
    typeof prisma,
    'fieldwireProjectUser' | 'primeChangeOrder' | 'primeChangeOrderSyncStatus'
>;

const primeChangeOrderStatuses = [
    'Draft',
    'Requested',
    'Pending Revision',
    'Pending Approval',
    'Approved',
    'Rejected',
    'Void',
];

const FIELDWIRE_PROJECT_USER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const parseDate = (value: string, field: string): Date => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError(`Invalid Fieldwire date for ${field}`);
    }
    return date;
};

const parseNullableDate = (value: string | null, field: string): Date | null => {
    if (!value) return null;
    return parseDate(value, field);
};

const parseNullableDecimal = (value: string | null): Prisma.Decimal | null => {
    if (value === null) return null;

    try {
        return new Prisma.Decimal(value);
    } catch {
        throw new BadRequestError('Invalid Fieldwire total_cost');
    }
};

const getFieldwireUserDisplayName = (user: FieldwireProjectUserResponse): string => {
    const name = [user.first_name, user.last_name].map((value) => value.trim()).filter(Boolean);
    return name.length > 0 ? name.join(' ') : user.email;
};

const mapFieldwireProjectUser = (
    user: FieldwireProjectUserResponse,
    projectId: string,
    fieldwireProjectId: string,
    syncedAt: Date
): Omit<Prisma.FieldwireProjectUserUncheckedCreateInput, 'id'> => ({
    projectId,
    fieldwireProjectId,
    fieldwireUserId: user.id,
    accountId: user.account_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: getFieldwireUserDisplayName(user),
    company: user.company,
    jobTitle: user.job_title,
    phoneNumber: user.phone_number,
    photoUrl: user.photo_url,
    role: user.role,
    isAdmin: user.is_admin,
    isApproved: user.is_approved,
    userDeletedAt: parseNullableDate(user.user_deleted_at, 'user_deleted_at'),
    fieldwireCreatedAt: parseDate(user.created_at, 'user.created_at'),
    fieldwireUpdatedAt: parseDate(user.updated_at, 'user.updated_at'),
    lastSyncedAt: syncedAt,
});

const mapAssignee = (user: CachedFieldwireProjectUser): PrimeChangeOrderAssignee => ({
    fieldwireUserId: user.fieldwireUserId,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    company: user.company,
    jobTitle: user.jobTitle,
    photoUrl: user.photoUrl,
    role: user.role,
    userDeletedAt: user.userDeletedAt,
});

const getAssigneeUserIds = (orders: Array<Pick<PrimeChangeOrder, 'assigneeUserId'>>) =>
    Array.from(
        new Set(
            orders
                .map((order) => order.assigneeUserId)
                .filter((id): id is number => typeof id === 'number')
        )
    );

const getErrorMessage = (error: unknown) => {
    const fieldwireMessage = getFieldwireErrorMessage(error);
    if (fieldwireMessage) return fieldwireMessage;

    if (error instanceof ZodError) return 'Invalid Fieldwire response';
    if (error instanceof Error) return error.message;
    return 'Unknown Fieldwire sync error';
};

const normalizeBoolean = (value: unknown) => value === true || value === 'true';

const buildDateRange = (from?: unknown, to?: unknown) => {
    if (!from && !to) return undefined;

    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = parseDate(String(from), 'dueDateFrom');
    if (to) range.lte = parseDate(String(to), 'dueDateTo');
    return range;
};

const buildDecimalRange = (min?: unknown, max?: unknown) => {
    if (!min && !max) return undefined;

    try {
        const range: { gte?: Prisma.Decimal; lte?: Prisma.Decimal } = {};
        if (min !== undefined) range.gte = new Prisma.Decimal(String(min));
        if (max !== undefined) range.lte = new Prisma.Decimal(String(max));
        return range;
    } catch {
        throw new BadRequestError('Invalid total cost filter');
    }
};

const buildOtherFieldwireProjectOrderWhere = (
    projectId: string,
    fieldwireProjectId: string | null
): Prisma.PrimeChangeOrderWhereInput => ({
    projectId,
    deletedAt: null,
    ...(fieldwireProjectId ? { fieldwireProjectId: { not: fieldwireProjectId } } : {}),
});

const buildOtherFieldwireProjectUserWhere = (
    projectId: string,
    fieldwireProjectId: string | null
): Prisma.FieldwireProjectUserWhereInput => ({
    projectId,
    ...(fieldwireProjectId ? { fieldwireProjectId: { not: fieldwireProjectId } } : {}),
});

const archivePrimeChangeOrdersFromOtherFieldwireProjects = async (
    client: FieldwireMappingCleanupClient,
    projectId: string,
    fieldwireProjectId: string | null,
    archivedAt: Date
): Promise<string[]> => {
    const staleOrders = await client.primeChangeOrder.findMany({
        where: buildOtherFieldwireProjectOrderWhere(projectId, fieldwireProjectId),
        select: { id: true },
    });
    const staleOrderIds = staleOrders.map((order) => order.id);

    if (staleOrderIds.length > 0) {
        await client.primeChangeOrder.updateMany({
            where: { id: { in: staleOrderIds } },
            data: {
                deletedAt: archivedAt,
                lastSyncedAt: archivedAt,
            },
        });
    }

    return staleOrderIds;
};

const deleteFieldwireUsersFromOtherProjects = async (
    client: FieldwireMappingCleanupClient,
    projectId: string,
    fieldwireProjectId: string | null
) => {
    await client.fieldwireProjectUser.deleteMany({
        where: buildOtherFieldwireProjectUserWhere(projectId, fieldwireProjectId),
    });
};

const resetPrimeChangeOrderSyncStatus = async (
    client: FieldwireMappingCleanupClient,
    projectId: string
) => {
    await client.primeChangeOrderSyncStatus.updateMany({
        where: { projectId },
        data: {
            lastSyncedAt: null,
            lastSyncStatus: null,
            lastSyncError: null,
            totalReceived: 0,
            createdCount: 0,
            updatedCount: 0,
            deletedCount: 0,
        },
    });
};

const mapChangeOrder = (
    order: FieldwireChangeOrder,
    projectId: string,
    syncedAt: Date
): Omit<Prisma.PrimeChangeOrderUncheckedCreateInput, 'id'> => {
    const fieldwireDeletedAt = parseNullableDate(order.deleted_at, 'deleted_at');

    return {
        projectId,
        fieldwireId: order.id,
        creatorUserId: order.creator_user_id,
        lastEditorUserId: order.last_editor_user_id,
        fieldwireProjectId: order.project_id,
        fieldwireCreatedAt: parseDate(order.created_at, 'created_at'),
        fieldwireUpdatedAt: parseDate(order.updated_at, 'updated_at'),
        deviceCreatedAt: parseDate(order.device_created_at, 'device_created_at'),
        deviceUpdatedAt: parseDate(order.device_updated_at, 'device_updated_at'),
        fieldwireDeletedAt,
        referenceNumber: order.reference_number,
        name: order.name,
        dueDate: parseNullableDate(order.due_date, 'due_date'),
        pmGroupNumber: order.pm_group_number,
        totalCost: parseNullableDecimal(order.total_cost),
        revisionId: order.revision_id,
        statusName: order.status_name,
        description: order.description,
        assigneeUserId: order.assignee_user_id,
        externalAssigneeUserId: order.external_assignee_user_id,
        scheduleImpact: order.schedule_impact,
        scheduleImpactDays: order.schedule_impact_days,
        currentRevisionId: order.current_revision_id,
        reasonTypeId: order.reason_type_id,
        lastSyncedAt: syncedAt,
        deletedAt: fieldwireDeletedAt,
    };
};

const cacheFieldwireProjectUsers = async (
    projectId: string,
    fieldwireProjectId: string,
    users: FieldwireProjectUserResponse[],
    syncedAt: Date
) => {
    if (users.length === 0) return;

    await prisma.$transaction(
        users.map((user) => {
            const data = mapFieldwireProjectUser(user, projectId, fieldwireProjectId, syncedAt);

            return prisma.fieldwireProjectUser.upsert({
                where: {
                    projectId_fieldwireUserId: {
                        projectId,
                        fieldwireUserId: user.id,
                    },
                },
                create: {
                    id: ulid(),
                    ...data,
                },
                update: data,
            });
        })
    );
};

const ensureFieldwireProjectUserCache = async ({
    projectId,
    fieldwireProjectId,
    fieldwireUserIds,
    accessToken,
    throwOnError = false,
}: {
    projectId: string;
    fieldwireProjectId: string | null;
    fieldwireUserIds: number[];
    accessToken?: string;
    throwOnError?: boolean;
}) => {
    if (!fieldwireProjectId || fieldwireUserIds.length === 0) return;

    try {
        const uniqueUserIds = Array.from(new Set(fieldwireUserIds));
        const cachedUsers = await prisma.fieldwireProjectUser.findMany({
            where: {
                projectId,
                fieldwireUserId: { in: uniqueUserIds },
            },
            select: {
                fieldwireProjectId: true,
                fieldwireUserId: true,
                lastSyncedAt: true,
            },
        });

        const cachedByUserId = new Map(cachedUsers.map((user) => [user.fieldwireUserId, user]));
        const staleBefore = new Date(Date.now() - FIELDWIRE_PROJECT_USER_CACHE_TTL_MS);
        const shouldRefresh = uniqueUserIds.some((fieldwireUserId) => {
            const cachedUser = cachedByUserId.get(fieldwireUserId);
            if (!cachedUser) return true;
            if (cachedUser.fieldwireProjectId !== fieldwireProjectId) return true;

            return cachedUser.lastSyncedAt < staleBefore;
        });

        if (!shouldRefresh) return;

        const syncedAt = new Date();
        const users = await FieldwireClient.getProjectUsers(fieldwireProjectId, accessToken);
        await cacheFieldwireProjectUsers(projectId, fieldwireProjectId, users, syncedAt);
    } catch (error) {
        if (throwOnError) throw error;
        console.error(
            `[prime-change-order] failed to refresh Fieldwire project users for project ${projectId}:`,
            error
        );
    }
};

const enrichChangeOrdersWithAssignees = async (
    orders: PrimeChangeOrder[],
    projectId: string
): Promise<PrimeChangeOrderWithAssignee[]> => {
    const withoutAssignees = () => orders.map((order) => ({ ...order, assignee: null }));

    const assigneeUserIds = getAssigneeUserIds(orders);
    if (assigneeUserIds.length === 0) {
        return withoutAssignees();
    }

    try {
        const assignees = await prisma.fieldwireProjectUser.findMany({
            where: {
                projectId,
                fieldwireUserId: { in: assigneeUserIds },
            },
        });
        const assigneeByUserId = new Map(
            assignees.map((assignee) => [assignee.fieldwireUserId, mapAssignee(assignee)])
        );

        return orders.map((order) => ({
            ...order,
            assignee: order.assigneeUserId
                ? (assigneeByUserId.get(order.assigneeUserId) ?? null)
                : null,
        }));
    } catch (error) {
        console.error(
            `[prime-change-order] failed to enrich assignees for project ${projectId}:`,
            error
        );
        return withoutAssignees();
    }
};

const emptySyncStatus = {
    lastSyncedAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    totalReceived: 0,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
};

export const PrimeChangeOrderService = {
    resetAfterFieldwireProjectChange: async ({
        projectId,
        fieldwireProjectId,
        tx = prisma,
    }: {
        projectId: string;
        fieldwireProjectId: string | null;
        tx?: FieldwireMappingCleanupClient;
    }) => {
        const archivedAt = new Date();
        const archivedOrderIds = await archivePrimeChangeOrdersFromOtherFieldwireProjects(
            tx,
            projectId,
            fieldwireProjectId,
            archivedAt
        );

        await deleteFieldwireUsersFromOtherProjects(tx, projectId, fieldwireProjectId);
        await resetPrimeChangeOrderSyncStatus(tx, projectId);

        return {
            archivedCount: archivedOrderIds.length,
            archivedOrderIds,
        };
    },

    getByProject: async (
        projectId: string,
        params: PaginationParams
    ): Promise<{ data: PrimeChangeOrderWithAssignee[]; count: number }> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const {
            statusName,
            scheduleImpact,
            dueDateFrom,
            dueDateTo,
            totalCostMin,
            totalCostMax,
            includeDeleted,
            ...restFilter
        } = filter || {};

        const whereClause: Prisma.PrimeChangeOrderWhereInput = {
            projectId,
            ...restFilter,
            ...(!normalizeBoolean(includeDeleted) && { deletedAt: null }),
            ...(statusName && { statusName: String(statusName) }),
            ...(scheduleImpact && { scheduleImpact: String(scheduleImpact) }),
            ...((dueDateFrom || dueDateTo) && {
                dueDate: buildDateRange(dueDateFrom, dueDateTo),
            }),
            ...((totalCostMin !== undefined || totalCostMax !== undefined) && {
                totalCost: buildDecimalRange(totalCostMin, totalCostMax),
            }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { referenceNumber: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.primeChangeOrder.count({ where: whereClause }),
            prisma.primeChangeOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof PrimeChangeOrder]: sortOrder },
            }),
        ]);

        await ensureFieldwireProjectUserCache({
            projectId,
            fieldwireProjectId: project.fieldwireProjectId,
            fieldwireUserIds: getAssigneeUserIds(data),
        });

        return { data: await enrichChangeOrdersWithAssignees(data, projectId), count };
    },

    getSyncStatus: async (projectId: string) => {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                name: true,
                fieldwireProjectId: true,
                primeChangeOrderSyncStatus: true,
                deletedAt: true,
            },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const latestRun = await prisma.primeChangeOrderSyncRun.findFirst({
            where: { projectId },
            orderBy: { startedAt: 'desc' },
        });

        return {
            projectId: project.id,
            projectName: project.name,
            fieldwireProjectId: project.fieldwireProjectId,
            syncStatus: project.primeChangeOrderSyncStatus ?? emptySyncStatus,
            latestRun,
        };
    },

    getFinancialSummary: async (projectId: string) => {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                contractValue: true,
                deletedAt: true,
            },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const approvedWhere: Prisma.PrimeChangeOrderWhereInput = {
            projectId,
            statusName: 'Approved',
            deletedAt: null,
            totalCost: { not: null },
        };
        const positiveWhere: Prisma.PrimeChangeOrderWhereInput = {
            ...approvedWhere,
            totalCost: { gt: new Prisma.Decimal(0) },
        };
        const negativeWhere: Prisma.PrimeChangeOrderWhereInput = {
            ...approvedWhere,
            totalCost: { lt: new Prisma.Decimal(0) },
        };

        const [approvedCount, approvedTotal, positiveTotal, negativeTotal] =
            await prisma.$transaction([
                prisma.primeChangeOrder.count({ where: approvedWhere }),
                prisma.primeChangeOrder.aggregate({
                    where: approvedWhere,
                    _sum: { totalCost: true },
                }),
                prisma.primeChangeOrder.aggregate({
                    where: positiveWhere,
                    _sum: { totalCost: true },
                }),
                prisma.primeChangeOrder.aggregate({
                    where: negativeWhere,
                    _sum: { totalCost: true },
                }),
            ]);

        const originalContractValue = Number(project.contractValue);
        const approvedChangeOrdersTotal = Number(approvedTotal._sum.totalCost ?? 0);

        return {
            projectId: project.id,
            originalContractValue,
            approvedChangeOrdersCount: approvedCount,
            approvedChangeOrdersTotal,
            approvedChangeOrdersPositiveTotal: Number(positiveTotal._sum.totalCost ?? 0),
            approvedChangeOrdersNegativeTotal: Number(negativeTotal._sum.totalCost ?? 0),
            revisedContractValue: originalContractValue + approvedChangeOrdersTotal,
        };
    },

    getStatusSummary: async (projectId: string) => {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, deletedAt: true },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const grouped = await prisma.primeChangeOrder.groupBy({
            by: ['statusName'],
            where: {
                projectId,
                deletedAt: null,
                statusName: { in: primeChangeOrderStatuses },
            },
            _count: { _all: true },
            _sum: { totalCost: true },
        });

        const byStatus = new Map(grouped.map((item) => [item.statusName, item]));

        return primeChangeOrderStatuses.map((statusName) => {
            const item = byStatus.get(statusName);
            return {
                statusName,
                count: item?._count._all ?? 0,
                totalCost: Number(item?._sum.totalCost ?? 0),
            };
        });
    },

    syncProject: async (
        projectId: string,
        trigger: SyncTrigger,
        userId?: string
    ): Promise<SyncResult> => {
        const startedAt = new Date();
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        if (!project.fieldwireProjectId) {
            const error = new BadRequestError('Project does not have a Fieldwire project ID');
            await PrimeChangeOrderService.recordFailedSync(
                projectId,
                trigger,
                startedAt,
                error,
                userId
            );
            throw error;
        }

        try {
            const syncedAt = new Date();
            const accessToken = await FieldwireClient.getAccessToken();
            const fieldwireChangeOrders = await FieldwireClient.getChangeOrders(
                project.fieldwireProjectId,
                accessToken
            );
            await ensureFieldwireProjectUserCache({
                projectId,
                fieldwireProjectId: project.fieldwireProjectId,
                fieldwireUserIds: fieldwireChangeOrders
                    .map((order) => order.assignee_user_id)
                    .filter((id): id is number => typeof id === 'number'),
                accessToken,
            });
            const changedIds: string[] = [];
            const counts: SyncCounts = {
                totalReceived: fieldwireChangeOrders.length,
                createdCount: 0,
                updatedCount: 0,
                deletedCount: 0,
            };

            await prisma.$transaction(async (tx) => {
                const archivedOrderIds = await archivePrimeChangeOrdersFromOtherFieldwireProjects(
                    tx,
                    projectId,
                    project.fieldwireProjectId,
                    syncedAt
                );
                await deleteFieldwireUsersFromOtherProjects(
                    tx,
                    projectId,
                    project.fieldwireProjectId
                );

                counts.deletedCount += archivedOrderIds.length;
                changedIds.push(...archivedOrderIds);

                for (const order of fieldwireChangeOrders) {
                    const existing = await tx.primeChangeOrder.findUnique({
                        where: { fieldwireId: order.id },
                        select: { id: true, deletedAt: true },
                    });
                    const data = mapChangeOrder(order, projectId, syncedAt);

                    if (existing) {
                        await tx.primeChangeOrder.update({
                            where: { id: existing.id },
                            data,
                        });
                        counts.updatedCount += 1;
                        changedIds.push(existing.id);

                        if (data.deletedAt && !existing.deletedAt) {
                            counts.deletedCount += 1;
                        }
                    } else {
                        const id = ulid();
                        await tx.primeChangeOrder.create({
                            data: {
                                id,
                                ...data,
                            },
                        });
                        counts.createdCount += 1;
                        changedIds.push(id);

                        if (data.deletedAt) {
                            counts.deletedCount += 1;
                        }
                    }
                }

                await tx.primeChangeOrderSyncRun.create({
                    data: {
                        id: ulid(),
                        projectId,
                        trigger,
                        status: 'SUCCESS',
                        startedAt,
                        finishedAt: new Date(),
                        totalReceived: counts.totalReceived,
                        createdCount: counts.createdCount,
                        updatedCount: counts.updatedCount,
                        deletedCount: counts.deletedCount,
                        userId: userId ?? null,
                    },
                });

                await tx.primeChangeOrderSyncStatus.upsert({
                    where: { projectId },
                    create: {
                        id: ulid(),
                        projectId,
                        lastSyncedAt: syncedAt,
                        lastSyncStatus: 'SUCCESS',
                        lastSyncError: null,
                        totalReceived: counts.totalReceived,
                        createdCount: counts.createdCount,
                        updatedCount: counts.updatedCount,
                        deletedCount: counts.deletedCount,
                    },
                    update: {
                        lastSyncedAt: syncedAt,
                        lastSyncStatus: 'SUCCESS',
                        lastSyncError: null,
                        totalReceived: counts.totalReceived,
                        createdCount: counts.createdCount,
                        updatedCount: counts.updatedCount,
                        deletedCount: counts.deletedCount,
                    },
                });
            });

            if (userId) {
                await ActivityLogService.log({
                    userId,
                    entityType: 'primeChangeOrder',
                    entityId: projectId,
                    action: 'update',
                    description:
                        `Synced Prime Change Orders for project ${project.name}: ` +
                        `${counts.createdCount} created, ${counts.updatedCount} updated, ` +
                        `${counts.deletedCount} deleted`,
                    affectedEntityIds: [projectId, ...changedIds],
                });
            }

            const { data } = await PrimeChangeOrderService.getByProject(projectId, {
                page: 1,
                size: counts.totalReceived || 25,
                skip: 0,
                take: counts.totalReceived || 25,
                sortBy: 'fieldwireUpdatedAt',
                sortOrder: 'desc',
                filter: {},
            });

            return {
                summary: {
                    projectId,
                    fieldwireProjectId: project.fieldwireProjectId,
                    status: 'SUCCESS',
                    syncedAt,
                    ...counts,
                },
                data,
            };
        } catch (error) {
            const fieldwireErrorMessage = getFieldwireErrorMessage(error);

            await PrimeChangeOrderService.recordFailedSync(
                projectId,
                trigger,
                startedAt,
                error,
                userId
            );

            if (fieldwireErrorMessage) {
                throw new BadRequestError(fieldwireErrorMessage);
            }

            throw error;
        }
    },

    syncMappedActiveProjects: async () => {
        const projects = await prisma.project.findMany({
            where: {
                deletedAt: null,
                status: 'ACTIVE',
                fieldwireProjectId: { not: null },
            },
            select: { id: true },
        });

        const summary = {
            attempted: projects.length,
            succeeded: 0,
            failed: 0,
        };

        for (const project of projects) {
            try {
                await PrimeChangeOrderService.syncProject(project.id, 'SCHEDULED');
                summary.succeeded += 1;
            } catch (error) {
                summary.failed += 1;
                console.error(
                    `[prime-change-order:scheduler] failed to sync project ${project.id}:`,
                    error
                );
            }
        }

        return summary;
    },

    recordFailedSync: async (
        projectId: string,
        trigger: SyncTrigger,
        startedAt: Date,
        error: unknown,
        userId?: string
    ) => {
        const message = getErrorMessage(error);
        const finishedAt = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.primeChangeOrderSyncRun.create({
                data: {
                    id: ulid(),
                    projectId,
                    trigger,
                    status: 'FAILED',
                    startedAt,
                    finishedAt,
                    error: message,
                    userId: userId ?? null,
                },
            });

            await tx.primeChangeOrderSyncStatus.upsert({
                where: { projectId },
                create: {
                    id: ulid(),
                    projectId,
                    lastSyncedAt: finishedAt,
                    lastSyncStatus: 'FAILED',
                    lastSyncError: message,
                    totalReceived: 0,
                    createdCount: 0,
                    updatedCount: 0,
                    deletedCount: 0,
                },
                update: {
                    lastSyncedAt: finishedAt,
                    lastSyncStatus: 'FAILED',
                    lastSyncError: message,
                    totalReceived: 0,
                    createdCount: 0,
                    updatedCount: 0,
                    deletedCount: 0,
                },
            });
        });

        if (userId) {
            await ActivityLogService.log({
                userId,
                entityType: 'primeChangeOrder',
                entityId: projectId,
                action: 'update',
                description: `Prime Change Order sync failed: ${message}`,
                affectedEntityIds: [projectId],
            });
        }
    },
};
