import { PrimeContract, Prisma, Project, ProjectSchedule, ProjectTeamMember } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { FieldwireClient } from '@modules/prime-change-order/fieldwire-client';
import { RevisionService } from '@modules/revision';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddPrimeContractRequest,
    AddScheduleRequest,
    AddTeamMemberRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    RemoveScheduleRequest,
    RemoveTeamMemberRequest,
    UpdateScheduleRequest,
} from './models';

type ProjectListFinancialFields = {
    approvedChangeOrdersCount: number;
    approvedChangeOrdersTotal: number;
    revisedContractValue: number;
    totalPOCommitted: number;
    activePOsCount: number;
    budgetLimit: number;
    budgetRemaining: number;
    spendUtilization: number;
};

type ProjectWithListFinancials<T> = T & ProjectListFinancialFields;

type PrimeContractWithFile = Prisma.PrimeContractGetPayload<{ include: { file: true } }>;
type ProjectScheduleWithFile = Prisma.ProjectScheduleGetPayload<{ include: { file: true } }>;

type FieldwireProjectOption = {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    accountId: number;
};

const getGroupedCount = (count: unknown): number => {
    if (typeof count === 'number') return count;
    if (!count || typeof count !== 'object' || !('_all' in count)) return 0;

    return Number((count as { _all?: number })._all ?? 0);
};

const addProjectListFinancials = async <
    T extends Pick<Project, 'id' | 'contractValue' | 'targetBudgetPercent'>,
>(
    projects: T[]
): Promise<Array<ProjectWithListFinancials<T>>> => {
    if (projects.length === 0) return [];
    const projectIds = projects.map((project) => project.id);

    const [changeOrderTotals, purchaseOrderTotals] = await prisma.$transaction([
        prisma.primeChangeOrder.groupBy({
            by: ['projectId'],
            orderBy: { projectId: 'asc' },
            where: {
                projectId: { in: projectIds },
                deletedAt: null,
                statusName: 'Approved',
                totalCost: { not: null },
            },
            _count: { _all: true },
            _sum: { totalCost: true },
        }),
        prisma.purchaseOrder.groupBy({
            by: ['projectId'],
            orderBy: { projectId: 'asc' },
            where: {
                projectId: { in: projectIds },
                deletedAt: null,
                status: { not: 'CANCELLED' },
            },
            _count: { _all: true },
            _sum: { total: true },
        }),
    ]);

    const changeOrderTotalsByProjectId = new Map(
        changeOrderTotals.map((total) => [total.projectId, total])
    );
    const purchaseOrderTotalsByProjectId = new Map(
        purchaseOrderTotals.map((total) => [total.projectId, total])
    );

    return projects.map((project) => {
        const approvedTotal = changeOrderTotalsByProjectId.get(project.id);
        const purchaseOrderTotal = purchaseOrderTotalsByProjectId.get(project.id);
        const approvedChangeOrdersTotal = Number(
            approvedTotal?._sum?.totalCost ?? new Prisma.Decimal(0)
        );
        const contractValue = Number(project.contractValue ?? new Prisma.Decimal(0));
        const revisedContractValue = contractValue + approvedChangeOrdersTotal;
        const totalPOCommitted = Number(purchaseOrderTotal?._sum?.total ?? new Prisma.Decimal(0));
        const targetBudgetPercent = Number(project.targetBudgetPercent ?? 100);
        const budgetLimit = revisedContractValue * (targetBudgetPercent / 100);
        const spendUtilization = budgetLimit > 0 ? (totalPOCommitted / budgetLimit) * 100 : 0;

        return {
            ...project,
            approvedChangeOrdersCount: getGroupedCount(approvedTotal?._count),
            approvedChangeOrdersTotal,
            revisedContractValue,
            totalPOCommitted,
            activePOsCount: getGroupedCount(purchaseOrderTotal?._count),
            budgetLimit,
            budgetRemaining: budgetLimit - totalPOCommitted,
            spendUtilization,
        };
    });
};

export const ProjectService = {
    getFieldwireProjects: async (): Promise<FieldwireProjectOption[]> => {
        const projects = await FieldwireClient.getProjects();

        return projects.map((project) => ({
            id: project.id,
            name: project.name,
            code: project.code,
            address: project.address,
            accountId: project.account_id,
        }));
    },

    createProject: async (request: ProjectCreateRequest, userId: string): Promise<Project> => {
        const {
            stageId,
            divisionId,
            gcId,
            leadPMId,
            estimatedStartDate,
            estimatedEndDate,
            setInactiveDate,
            tcoDate,
            fieldwireProjectId,
            fieldwireProjectName,
            ...rest
        } = request;

        const stage = await prisma.lookup.findUnique({ where: { id: stageId } });
        if (!stage) throw new NotFoundError('Project stage not found');

        const division = await prisma.lookup.findUnique({ where: { id: divisionId } });
        if (!division) throw new NotFoundError('Project division not found');

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) throw new NotFoundError('General contractor not found');

        if (leadPMId) {
            const leadPM = await prisma.employee.findUnique({ where: { id: leadPMId } });
            if (!leadPM) throw new NotFoundError('Lead PM not found');
        }

        if (fieldwireProjectId) {
            const existing = await prisma.project.findUnique({ where: { fieldwireProjectId } });
            if (existing) throw new ConflictError('Fieldwire project ID already exists');
        }

        return await prisma.$transaction(async (tx) => {
            let jobNumber = rest.jobNumber;
            if (!jobNumber) {
                const year = new Date().getFullYear();
                const prefix = `${year}-`;
                const latest = await tx.project.findFirst({
                    where: { jobNumber: { startsWith: prefix } },
                    orderBy: { jobNumber: 'desc' },
                    select: { jobNumber: true },
                });
                let seq = 1;
                if (latest?.jobNumber) {
                    const suffix = latest.jobNumber.split('-')[1];
                    seq = (parseInt(suffix, 10) || 0) + 1;
                }
                jobNumber = `${prefix}${String(seq).padStart(3, '0')}`;
            } else {
                const existing = await tx.project.findFirst({ where: { jobNumber } });
                if (existing) throw new ConflictError('Job number already exists');
            }

            const id = ulid();

            const project = await tx.project.create({
                data: {
                    ...rest,
                    id,
                    jobNumber,
                    stageId,
                    divisionId,
                    gcId,
                    leadPMId: leadPMId ?? null,
                    fieldwireProjectId: fieldwireProjectId ?? null,
                    fieldwireProjectName: fieldwireProjectId
                        ? (fieldwireProjectName?.trim() ?? null)
                        : null,
                    estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
                    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
                    setInactiveDate: setInactiveDate ? new Date(setInactiveDate) : null,
                    tcoDate: tcoDate ? new Date(tcoDate) : null,
                },
            });

            if (leadPMId) {
                await tx.projectTeamMember.create({
                    data: {
                        employeeId: leadPMId,
                        projectId: project.id,
                        role: 'Lead PM',
                        isLead: true,
                    },
                });
            }

            await FileService.createProjectFolders(tx, project.id, project.name, userId);

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: project.id,
                action: 'create',
                description: `Created project ${project.name} (${project.jobNumber})`,
                affectedEntityIds: [gcId, ...(leadPMId ? [leadPMId] : [])],
                tx,
            });

            return project;
        });
    },

    getProject: async (id: string): Promise<Project> => {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                stage: true,
                division: true,
                gc: true,
                leadPM: true,
                teamMembers: { include: { employee: true } },
            },
        });

        if (!project) {
            throw new NotFoundError('Project not found');
        }

        checkDeletedAt(project);

        return project;
    },

    getProjects: async (
        params: PaginationParams
    ): Promise<{
        data: Project[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { stageId, divisionId, gcId, leadPMId, status, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(stageId && { stageId }),
            ...(divisionId && { divisionId }),
            ...(gcId && { gcId }),
            ...(leadPMId && { leadPMId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { jobNumber: { contains: search, mode: 'insensitive' as const } },
                    { contractNumber: { contains: search, mode: 'insensitive' as const } },
                    { fieldwireProjectName: { contains: search, mode: 'insensitive' as const } },
                    { city: { contains: search, mode: 'insensitive' as const } },
                    { state: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.project.count({ where: whereClause }),

            prisma.project.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Project]: sortOrder,
                },
                include: {
                    stage: true,
                    division: true,
                    gc: true,
                    leadPM: true,
                },
            }),
        ]);

        return { data: await addProjectListFinancials(data), count };
    },

    updateProject: async (request: ProjectUpdateRequest, userId: string): Promise<Project> => {
        const {
            id,
            stageId,
            divisionId,
            gcId,
            leadPMId,
            estimatedStartDate,
            estimatedEndDate,
            setInactiveDate,
            tcoDate,
            jobNumber,
            fieldwireProjectId,
            fieldwireProjectName,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const stage = await prisma.lookup.findUnique({ where: { id: stageId } });
        if (!stage) throw new NotFoundError('Project stage not found');

        const division = await prisma.lookup.findUnique({ where: { id: divisionId } });
        if (!division) throw new NotFoundError('Project division not found');

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) throw new NotFoundError('General contractor not found');

        if (leadPMId) {
            const leadPM = await prisma.employee.findUnique({ where: { id: leadPMId } });
            if (!leadPM) throw new NotFoundError('Lead PM not found');
        }

        if (jobNumber && jobNumber !== project.jobNumber) {
            const existing = await prisma.project.findFirst({
                where: { jobNumber, NOT: { id } },
            });
            if (existing) throw new ConflictError('Job number already exists');
        }

        if (fieldwireProjectId && fieldwireProjectId !== project.fieldwireProjectId) {
            const existing = await prisma.project.findUnique({ where: { fieldwireProjectId } });
            if (existing) throw new ConflictError('Fieldwire project ID already exists');
        }

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, { entityType: 'PROJECT', entityId: id, userId });

            const updated = await tx.project.update({
                where: { id },
                data: {
                    ...rest,
                    jobNumber: jobNumber ?? project.jobNumber,
                    stageId,
                    divisionId,
                    gcId,
                    leadPMId: leadPMId ?? null,
                    fieldwireProjectId: fieldwireProjectId ?? null,
                    fieldwireProjectName: fieldwireProjectId
                        ? (fieldwireProjectName?.trim() ??
                          (fieldwireProjectId === project.fieldwireProjectId
                              ? project.fieldwireProjectName
                              : null))
                        : null,
                    estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
                    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
                    setInactiveDate: setInactiveDate ? new Date(setInactiveDate) : null,
                    tcoDate: tcoDate ? new Date(tcoDate) : null,
                },
            });

            if (updated.name !== project.name) {
                const folderId = await FileService.getProjectFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, updated.name, tx);
            }

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: id,
                action: 'update',
                description: `Updated project ${updated.name}`,
                affectedEntityIds: [
                    gcId,
                    ...(leadPMId ? [leadPMId] : []),
                    ...(project.gcId !== gcId ? [project.gcId] : []),
                    ...(project.leadPMId && project.leadPMId !== leadPMId
                        ? [project.leadPMId]
                        : []),
                ],
                tx,
            });

            return updated;
        });
    },

    getProjectSchedules: async (projectId: string): Promise<ProjectScheduleWithFile[]> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return await prisma.projectSchedule.findMany({
            where: { projectId, deletedAt: null },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
            include: { file: true },
        });
    },

    addSchedule: async (request: AddScheduleRequest, userId: string): Promise<ProjectSchedule> => {
        const { projectId, fileId, date, adjustedFinishDate, ...rest } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        if (fileId) {
            const file = await prisma.file.findUnique({ where: { id: fileId } });
            if (!file) throw new NotFoundError('File not found');
            checkDeletedAt(file);

            const existing = await prisma.projectSchedule.findUnique({ where: { fileId } });
            if (existing) throw new ConflictError('File already attached to a schedule');
        }

        return await prisma.$transaction(async (tx) => {
            if (fileId) {
                const folderId = await FileService.getProjectSubFolderId(projectId, 'SCHEDULE', tx);
                await FileService.moveFileToFolder(fileId, folderId, tx);
            }

            const schedule = await tx.projectSchedule.create({
                data: {
                    ...rest,
                    id: ulid(),
                    projectId,
                    ...(fileId ? { fileId } : {}),
                    date: new Date(date),
                    adjustedFinishDate: adjustedFinishDate ? new Date(adjustedFinishDate) : null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'create',
                description: `Added schedule entry to project ${project.name}`,
                affectedEntityIds: [schedule.id, ...(fileId ? [fileId] : [])],
                tx,
            });

            return schedule;
        });
    },

    updateSchedule: async (
        request: UpdateScheduleRequest,
        userId: string
    ): Promise<ProjectSchedule> => {
        const { id, fileId, date, adjustedFinishDate, ...rest } = request;

        const schedule = await prisma.projectSchedule.findUnique({
            where: { id },
            include: { project: true },
        });
        if (!schedule) throw new NotFoundError('Schedule not found');
        checkDeletedAt(schedule);

        if (fileId && fileId !== schedule.fileId) {
            const file = await prisma.file.findUnique({ where: { id: fileId } });
            if (!file) throw new NotFoundError('File not found');
            checkDeletedAt(file);

            const existing = await prisma.projectSchedule.findUnique({ where: { fileId } });
            if (existing) throw new ConflictError('File already attached to a schedule');
        }

        return await prisma.$transaction(async (tx) => {
            if (fileId && fileId !== schedule.fileId) {
                const folderId = await FileService.getProjectSubFolderId(
                    schedule.projectId,
                    'SCHEDULE',
                    tx
                );
                await FileService.moveFileToFolder(fileId, folderId, tx);
            }

            const updated = await tx.projectSchedule.update({
                where: { id },
                data: {
                    ...rest,
                    date: new Date(date),
                    adjustedFinishDate: adjustedFinishDate ? new Date(adjustedFinishDate) : null,
                    fileId: fileId ?? null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: schedule.projectId,
                action: 'update',
                description: `Updated schedule entry on project ${schedule.project.name}`,
                affectedEntityIds: [
                    schedule.id,
                    ...(fileId ? [fileId] : []),
                    ...(schedule.fileId && schedule.fileId !== fileId ? [schedule.fileId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    removeSchedule: async (request: RemoveScheduleRequest, userId: string): Promise<void> => {
        const { id } = request;

        const schedule = await prisma.projectSchedule.findUnique({
            where: { id },
            include: { project: true },
        });
        if (!schedule) throw new NotFoundError('Schedule not found');
        checkDeletedAt(schedule);

        await prisma.projectSchedule.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'project',
            entityId: schedule.projectId,
            action: 'delete',
            description: `Removed schedule entry from project ${schedule.project.name}`,
            affectedEntityIds: [schedule.id, ...(schedule.fileId ? [schedule.fileId] : [])],
        });
    },

    addTeamMember: async (
        request: AddTeamMemberRequest,
        userId: string
    ): Promise<ProjectTeamMember> => {
        const { projectId, employeeId, role, isLead } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        const existing = await prisma.projectTeamMember.findUnique({
            where: { employeeId_projectId: { employeeId, projectId } },
        });
        if (existing) throw new ConflictError('Employee is already a team member');

        return await prisma.$transaction(async (tx) => {
            if (isLead) {
                await tx.projectTeamMember.updateMany({
                    where: { projectId, isLead: true },
                    data: { isLead: false },
                });
                await tx.project.update({
                    where: { id: projectId },
                    data: { leadPMId: employeeId },
                });
            }

            const member = await tx.projectTeamMember.create({
                data: { projectId, employeeId, role, isLead },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'link',
                description: `Added ${employee.name} to project ${project.name} as ${role}`,
                affectedEntityIds: [employeeId],
                tx,
            });

            return member;
        });
    },

    removeTeamMember: async (request: RemoveTeamMemberRequest, userId: string): Promise<void> => {
        const { projectId, employeeId } = request;

        const member = await prisma.projectTeamMember.findUnique({
            where: { employeeId_projectId: { employeeId, projectId } },
            include: { project: true, employee: true },
        });
        if (!member) throw new NotFoundError('Team member not found');

        await prisma.$transaction(async (tx) => {
            await tx.projectTeamMember.delete({
                where: { employeeId_projectId: { employeeId, projectId } },
            });

            if (member.isLead) {
                await tx.project.update({
                    where: { id: projectId },
                    data: { leadPMId: null },
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'unlink',
                description: `Removed ${member.employee.name} from project ${member.project.name}`,
                affectedEntityIds: [employeeId],
                tx,
            });
        });
    },

    addPrimeContract: async (
        request: AddPrimeContractRequest,
        userId: string
    ): Promise<PrimeContract> => {
        const { projectId, fileId } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        const existing = await prisma.primeContract.findUnique({ where: { projectId } });
        if (existing) throw new ConflictError('Prime contract already exists for this project');

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(
                projectId,
                'PRIME_CONTRACT',
                tx
            );
            await FileService.moveFileToFolder(fileId, folderId, tx);

            const primeContract = await tx.primeContract.create({
                data: { id: ulid(), projectId, fileId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'link',
                description: `Added prime contract to project ${project.name}`,
                affectedEntityIds: [fileId, primeContract.id],
                tx,
            });

            return primeContract;
        });
    },

    getProjectPrimeContracts: async (projectId: string): Promise<PrimeContractWithFile[]> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return await prisma.primeContract.findMany({
            where: { projectId, file: { deletedAt: null } },
            orderBy: { uploadedAt: 'desc' },
            include: { file: true },
        });
    },

    setActive: async (id: string, userId: string): Promise<Project> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const updated = await prisma.project.update({
            where: { id },
            data: { status: 'ACTIVE', startDate: project.startDate ?? new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'project',
            entityId: id,
            action: 'update',
            description: `Set project ${updated.name} active`,
        });

        return updated;
    },

    setInactive: async (id: string, userId: string): Promise<Project> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const updated = await prisma.project.update({
            where: { id },
            data: { status: 'INACTIVE', setInactiveDate: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'project',
            entityId: id,
            action: 'update',
            description: `Set project ${updated.name} inactive`,
        });

        return updated;
    },

    setClosed: async (id: string, userId: string): Promise<Project> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const updated = await prisma.project.update({
            where: { id },
            data: { status: 'CLOSED', closedDate: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'project',
            entityId: id,
            action: 'update',
            description: `Set project ${updated.name} closed`,
        });

        return updated;
    },

    setCompleted: async (id: string, userId: string): Promise<Project> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const updated = await prisma.project.update({
            where: { id },
            data: { status: 'COMPLETED', completedDate: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'project',
            entityId: id,
            action: 'update',
            description: `Set project ${updated.name} completed`,
        });

        return updated;
    },

    getAssignedProjects: async (
        employeeId: string,
        params: PaginationParams
    ): Promise<{
        data: Project[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { stageId, divisionId, gcId, status, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            teamMembers: { some: { employeeId } },
            ...restFilter,
            ...(stageId && { stageId }),
            ...(divisionId && { divisionId }),
            ...(gcId && { gcId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                    { jobNumber: { contains: search, mode: 'insensitive' as const } },
                    { contractNumber: { contains: search, mode: 'insensitive' as const } },
                    { fieldwireProjectName: { contains: search, mode: 'insensitive' as const } },
                    { city: { contains: search, mode: 'insensitive' as const } },
                    { state: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.project.count({ where: whereClause }),

            prisma.project.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Project]: sortOrder,
                },
                include: {
                    stage: true,
                    division: true,
                    gc: true,
                    leadPM: true,
                },
            }),
        ]);

        return { data: await addProjectListFinancials(data), count };
    },
};
