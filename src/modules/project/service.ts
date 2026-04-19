import { PrimeContract, Project, ProjectTeamMember } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddPrimeContractRequest,
    AddTeamMemberRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    RemoveTeamMemberRequest,
} from './models';

export const ProjectService = {
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

        return { data, count };
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

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.project.update({
                where: { id },
                data: {
                    ...rest,
                    jobNumber: jobNumber ?? project.jobNumber,
                    stageId,
                    divisionId,
                    gcId,
                    leadPMId: leadPMId ?? null,
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
                tx,
            });

            return updated;
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
                tx,
            });

            return primeContract;
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

        return { data, count };
    },
};
