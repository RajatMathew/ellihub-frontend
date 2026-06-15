import { GCDocument, GeneralContractor, Prisma, ProjectStatus } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import {
    ActivityLogService,
    activityChange,
    buildUpdateActivityDescription,
    formatEnumActivityValue,
} from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddGcDocumentRequest,
    GcCreateRequest,
    GcUpdateRequest,
    RemoveGcDocumentRequest,
    UpdateGcDocumentRequest,
} from './models';

const gcListInclude = {
    gcType: true,
    contacts: true,
    _count: {
        select: {
            contacts: true,
            projects: true,
        },
    },
} satisfies Prisma.GeneralContractorInclude;

const gcDetailInclude = {
    gcType: true,
    contacts: true,
    projects: {
        where: { deletedAt: null },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
            name: true,
            jobNumber: true,
            status: true,
            contractValue: true,
            estimatedStartDate: true,
            estimatedEndDate: true,
            city: true,
            state: true,
            createdAt: true,
            updatedAt: true,
        },
    },
} satisfies Prisma.GeneralContractorInclude;

type GcProjectMetrics = {
    activeProjects: number;
    totalCommitted: number;
};

type GcListItem = Prisma.GeneralContractorGetPayload<{ include: typeof gcListInclude }> &
    GcProjectMetrics;
type GcDetail = Prisma.GeneralContractorGetPayload<{ include: typeof gcDetailInclude }> &
    GcProjectMetrics;
type GcStats = {
    totalGCs: number;
    activeProjects: number;
    totalCommitted: number;
};

const optionalNullableChanged = <T>(next: T | null | undefined, current: T | null) =>
    next !== undefined && (next ?? null) !== current;

const hasGcProfileChanged = (gc: GeneralContractor, request: GcUpdateRequest) =>
    request.name !== gc.name ||
    request.gcTypeId !== gc.gcTypeId ||
    request.status !== gc.status ||
    request.paymentTerms !== gc.paymentTerms ||
    request.retainagePercent !== gc.retainagePercent ||
    optionalNullableChanged(request.address, gc.address) ||
    optionalNullableChanged(request.email, gc.email) ||
    optionalNullableChanged(request.phone, gc.phone) ||
    optionalNullableChanged(request.website, gc.website) ||
    optionalNullableChanged(request.fax, gc.fax);

const getProjectMetricsByGcId = async (gcIds: string[]): Promise<Map<string, GcProjectMetrics>> => {
    if (gcIds.length === 0) return new Map();

    const rows = await prisma.project.groupBy({
        by: ['gcId'],
        where: { gcId: { in: gcIds }, deletedAt: null, status: ProjectStatus.ACTIVE },
        _count: { _all: true },
        _sum: { contractValue: true },
    });

    return new Map(
        rows.map((row) => [
            row.gcId,
            {
                activeProjects: row._count._all,
                totalCommitted: Number(row._sum.contractValue ?? 0),
            },
        ])
    );
};

const withProjectMetrics = async <T extends { id: string }>(
    gcs: T[]
): Promise<(T & GcProjectMetrics)[]> => {
    const metricsByGcId = await getProjectMetricsByGcId(gcs.map((gc) => gc.id));

    return gcs.map((gc) => ({
        ...gc,
        ...(metricsByGcId.get(gc.id) ?? { activeProjects: 0, totalCommitted: 0 }),
    }));
};

export const GcService = {
    createGc: async (request: GcCreateRequest, userId: string): Promise<GeneralContractor> => {
        const { gcTypeId, ...rest } = request;

        const type = await prisma.lookup.findUnique({ where: { id: gcTypeId } });
        if (!type) throw new NotFoundError('GC type not found');

        return await prisma.$transaction(async (tx) => {
            const gc = await tx.generalContractor.create({
                data: { ...rest, id: generateNanoId(), gcTypeId },
            });

            await FileService.createGcFolder(tx, gc.id, request.name, userId);

            await ActivityLogService.log({
                userId,
                entityType: 'gc',
                entityId: gc.id,
                action: 'create',
                description: `Created general contractor ${gc.name}`,
                tx,
            });

            return gc;
        });
    },

    getGc: async (id: string): Promise<GcDetail> => {
        const gc = await prisma.generalContractor.findUnique({
            where: { id },
            include: gcDetailInclude,
        });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        const [gcWithMetrics] = await withProjectMetrics([gc]);
        return gcWithMetrics;
    },

    getStats: async (): Promise<GcStats> => {
        const activeProjectWhere = {
            deletedAt: null,
            status: ProjectStatus.ACTIVE,
            gc: { deletedAt: null },
        } satisfies Prisma.ProjectWhereInput;

        const [totalGCs, activeProjects, committed] = await prisma.$transaction([
            prisma.generalContractor.count({ where: { deletedAt: null } }),
            prisma.project.count({ where: activeProjectWhere }),
            prisma.project.aggregate({ where: activeProjectWhere, _sum: { contractValue: true } }),
        ]);

        return {
            totalGCs,
            activeProjects,
            totalCommitted: Number(committed._sum.contractValue ?? 0),
        };
    },

    updateGc: async (request: GcUpdateRequest, userId: string): Promise<GeneralContractor> => {
        const { id, gcTypeId, ...rest } = request;

        const gc = await prisma.generalContractor.findUnique({ where: { id } });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        const [type, currentType] = await Promise.all([
            prisma.lookup.findUnique({ where: { id: gcTypeId } }),
            prisma.lookup.findUnique({ where: { id: gc.gcTypeId } }),
        ]);
        if (!type) throw new NotFoundError('GC type not found');

        const profileChanged = hasGcProfileChanged(gc, request);

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.generalContractor.update({
                where: { id },
                data: { ...rest, gcTypeId },
            });

            if (request.name !== gc.name) {
                const folderId = await FileService.getGcFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, request.name, tx);
            }

            if (profileChanged) {
                await ActivityLogService.log({
                    userId,
                    entityType: 'gc',
                    entityId: updated.id,
                    action: 'update',
                    description: buildUpdateActivityDescription(
                        `general contractor ${updated.name}`,
                        [
                            activityChange('Name', gc.name, updated.name),
                            activityChange('Type', currentType?.label, type.label),
                            activityChange(
                                'Status',
                                gc.status,
                                updated.status,
                                formatEnumActivityValue
                            ),
                            activityChange('Address', gc.address, updated.address),
                            activityChange('Email', gc.email, updated.email),
                            activityChange('Phone', gc.phone, updated.phone),
                            activityChange('Website', gc.website, updated.website),
                            activityChange('Fax', gc.fax, updated.fax),
                            activityChange(
                                'Payment terms',
                                gc.paymentTerms,
                                updated.paymentTerms,
                                formatEnumActivityValue
                            ),
                            activityChange(
                                'Retainage percent',
                                gc.retainagePercent,
                                updated.retainagePercent
                            ),
                        ]
                    ),
                    tx,
                });
            }

            return updated;
        });
    },

    deleteGc: async (id: string, userId: string): Promise<void> => {
        const gc = await prisma.generalContractor.findUnique({ where: { id } });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        const linkedProjectWhere = { gcId: id, deletedAt: null };
        const [linkedProjectCount, linkedProject] = await Promise.all([
            prisma.project.count({ where: linkedProjectWhere }),
            prisma.project.findFirst({
                where: linkedProjectWhere,
                select: { name: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        if (linkedProjectCount) {
            const projectName = linkedProject?.name ?? 'a project';
            const projectText =
                linkedProjectCount === 1
                    ? `project ${projectName}`
                    : `${linkedProjectCount} projects, including ${projectName}`;
            throw new ConflictError(
                `Cannot delete general contractor because it is linked to ${projectText}. Reassign the project first.`
            );
        }

        const affectedContacts = await prisma.contact.findMany({
            where: { generalContractorId: id },
            select: { id: true },
        });

        await prisma.$transaction([
            prisma.contact.updateMany({
                where: { generalContractorId: id },
                data: { generalContractorId: null, isPrimary: false },
            }),
            prisma.generalContractor.update({
                where: { id },
                data: { deletedAt: new Date() },
            }),
        ]);

        await ActivityLogService.log({
            userId,
            entityType: 'gc',
            entityId: id,
            action: 'delete',
            description: `Deleted general contractor ${gc.name}`,
            affectedEntityIds: affectedContacts.map((c) => c.id),
        });
    },

    addDocumentToGc: async (request: AddGcDocumentRequest, userId: string): Promise<GCDocument> => {
        const { gcId, fileId, expiresOn } = request;

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }
        checkDeletedAt(gc);

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) {
            throw new NotFoundError('File not found');
        }
        checkDeletedAt(file);

        const existing = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
        });
        if (existing) {
            throw new ConflictError('Document already linked to this general contractor');
        }

        return await prisma.$transaction(async (tx) => {
            const gcFolderId = await FileService.getGcFolderId(gcId, tx);
            await FileService.moveFileToFolder(fileId, gcFolderId, tx);

            const doc = await tx.gCDocument.create({
                data: {
                    id: generateNanoId(),
                    gcId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'gc',
                entityId: gcId,
                action: 'link',
                description: `Linked document ${file.name} to GC ${gc.name}`,
                affectedEntityIds: [fileId],
                tx,
            });

            return doc;
        });
    },

    updateGcDocument: async (
        request: UpdateGcDocumentRequest,
        userId: string
    ): Promise<GCDocument> => {
        const { gcId, fileId, expiresOn } = request;

        const document = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
            include: { file: true, gc: true },
        });
        if (!document) {
            throw new NotFoundError('GC document not found');
        }

        const updated = await prisma.gCDocument.update({
            where: { id: document.id },
            data: { expiresOn: expiresOn ? new Date(expiresOn) : null },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'gc',
            entityId: gcId,
            action: 'update',
            description: buildUpdateActivityDescription(`GC document ${document.file.name}`, [
                activityChange('Expiration date', document.expiresOn, updated.expiresOn),
            ]),
            affectedEntityIds: [fileId],
        });

        return updated;
    },

    removeDocumentFromGc: async (
        request: RemoveGcDocumentRequest,
        userId: string
    ): Promise<void> => {
        const { gcId, fileId } = request;

        const document = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
            include: { file: true, gc: true },
        });
        if (!document) {
            throw new NotFoundError('GC document not found');
        }

        await prisma.gCDocument.delete({ where: { id: document.id } });

        await ActivityLogService.log({
            userId,
            entityType: 'gc',
            entityId: gcId,
            action: 'unlink',
            description: `Unlinked document ${document.file.name} from GC ${document.gc.name}`,
            affectedEntityIds: [fileId],
        });
    },

    getGcs: async (
        params: PaginationParams
    ): Promise<{
        data: GcListItem[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { gcTypeId, status, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(gcTypeId && { gcTypeId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                    { website: { contains: search, mode: 'insensitive' as const } },
                    { address: { contains: search, mode: 'insensitive' as const } },
                    { fax: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const resolvedSortBy = sortBy ?? 'name';
        const resolvedSortOrder = sortOrder ?? 'asc';
        const orderBy = (
            resolvedSortBy === 'type'
                ? { gcType: { name: resolvedSortOrder } }
                : {
                      [resolvedSortBy as keyof GeneralContractor]: resolvedSortOrder,
                  }
        ) as Prisma.GeneralContractorOrderByWithRelationInput;

        const [count, data] = await prisma.$transaction([
            prisma.generalContractor.count({
                where: whereClause,
            }),

            prisma.generalContractor.findMany({
                where: whereClause,
                skip,
                take,
                orderBy,
                include: gcListInclude,
            }),
        ]);

        const dataWithMetrics = await withProjectMetrics(data);

        return { data: dataWithMetrics, count };
    },
};
