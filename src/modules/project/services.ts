import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { FileService } from '@modules/file/services';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    PrimeContractUpsertRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ScheduleEntryCreateRequest,
    ScheduleEntryUpdateRequest,
    TeamMemberRequest,
} from './models';

const projectListSelect = {
    id: true,
    name: true,
    jobNumber: true,
    contractNumber: true,
    division: true,
    stageId: true,
    stage: { select: { id: true, name: true, code: true, color: true } },
    description: true,
    status: { select: { id: true, name: true, label: true, color: true, order: true } },
    streetAddress: true,
    city: true,
    state: true,
    effectiveStartDate: true,
    effectiveEndDate: true,
    gc: { select: { id: true, name: true } },
    leadPM: { select: { id: true, name: true, email: true } },
    primeContract: { select: { contractValue: true } },
    createdAt: true,
} as const;

const projectDetailInclude = {
    stage: true,
    status: true,
    gc: { select: { id: true, name: true, email: true, phone: true } },
    leadPM: { select: { id: true, name: true, email: true, phoneNumber: true } },
    primeContract: true,
    projectScheduleEntries: { where: { deletedAt: null }, orderBy: { date: 'desc' as const } },
    teamMembers: {
        where: { deletedAt: null },
        include: { employee: { select: { id: true, name: true, email: true } } },
    },
} as const;

export const ProjectService = {
    listProjects: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            statusId,
            division,
            stageId,
            gcId,
            leadPMId,
            year,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(statusId && { statusId }),
            ...(division && { division }),
            ...(stageId && { stageId }),
            ...(gcId && { gcId }),
            ...(leadPMId && { leadPMId }),
        };

        const andConditions: unknown[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { jobNumber: { contains: search, mode: 'insensitive' as const } },
                    { contractNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            });
        }

        if (year) {
            const y = Number(year);
            if (!isNaN(y)) {
                andConditions.push(
                    {
                        OR: [
                            { effectiveStartDate: null },
                            { effectiveStartDate: { lte: new Date(y, 11, 31) } },
                        ],
                    },
                    {
                        OR: [
                            { effectiveEndDate: null },
                            { effectiveEndDate: { gte: new Date(y, 0, 1) } },
                        ],
                    }
                );
            }
        }

        if (andConditions.length > 0) whereClause.AND = andConditions;

        const [count, data] = await prisma.$transaction([
            prisma.project.count({ where: whereClause }),
            prisma.project.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: projectListSelect,
            }),
        ]);

        return { data, count };
    },

    createProject: async (data: ProjectCreateRequest, userId: string) => {
        const { contract, statusId: requestedStatusId, ...projectData } = data;

        // Validate GC
        const gc = await prisma.generalContractor.findUnique({ where: { id: projectData.gcId } });
        if (!gc) throw new NotFoundError('General Contractor not found');
        checkDeletedAt(gc);

        // Validate Employee (leadPM)
        const employee = await prisma.employee.findUnique({ where: { id: projectData.leadPMId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        // Validate Stage
        const stage = await prisma.projectStage.findUnique({ where: { id: projectData.stageId } });
        if (!stage) throw new NotFoundError('Project stage not found');

        // Resolve status
        let statusId: string;
        if (requestedStatusId) {
            const status = await prisma.projectStatus.findUnique({
                where: { id: requestedStatusId },
            });
            if (!status) throw new NotFoundError('Project status not found');
            statusId = requestedStatusId;
        } else {
            const defaultStatus = await prisma.projectStatus.findFirst({
                where: { isDefault: true },
            });
            if (!defaultStatus) throw new BadRequestError('No default project status configured');
            statusId = defaultStatus.id;
        }

        return await prisma.$transaction(async (tx) => {
            // Auto-generate jobNumber if not provided
            let jobNumber = projectData.jobNumber;
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

            const projectId = ulid();

            await tx.project.create({
                data: {
                    id: projectId,
                    name: projectData.name,
                    description: projectData.description,
                    jobNumber,
                    contractNumber: projectData.contractNumber,
                    stageId: projectData.stageId,
                    division: projectData.division,
                    statusId,
                    gcId: projectData.gcId,
                    leadPMId: projectData.leadPMId,
                    streetAddress: projectData.streetAddress,
                    city: projectData.city,
                    state: projectData.state,
                    zipCode: projectData.zipCode,
                    effectiveStartDate: projectData.effectiveStartDate,
                    effectiveEndDate: projectData.effectiveEndDate,
                },
            });

            if (contract) {
                await tx.primeContract.create({
                    data: {
                        id: ulid(),
                        projectId,
                        contractValue: contract.contractValue,
                    },
                });
            }

            await tx.projectTeamAssignment.create({
                data: {
                    role: 'Lead',
                    employeeId: projectData.leadPMId,
                    projectId,
                },
            });

            await FileService.createProjectFolders(tx, projectId, userId);

            return await tx.project.findUniqueOrThrow({
                where: { id: projectId },
                include: projectDetailInclude,
            });
        });
    },

    getProject: async (id: string) => {
        const project = await prisma.project.findUnique({
            where: { id },
            include: projectDetailInclude,
        });

        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        return project;
    },

    updateProject: async (id: string, data: ProjectUpdateRequest) => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const validations: Promise<void>[] = [];
        if (data.gcId) {
            validations.push(
                prisma.generalContractor.findUnique({ where: { id: data.gcId } }).then((gc) => {
                    if (!gc) throw new NotFoundError('General Contractor not found');
                    checkDeletedAt(gc);
                })
            );
        }
        if (data.leadPMId) {
            validations.push(
                prisma.employee.findUnique({ where: { id: data.leadPMId } }).then((emp) => {
                    if (!emp) throw new NotFoundError('Employee not found');
                    checkDeletedAt(emp);
                })
            );
        }
        if (data.stageId) {
            validations.push(
                prisma.projectStage.findUnique({ where: { id: data.stageId } }).then((stage) => {
                    if (!stage) throw new NotFoundError('Project stage not found');
                })
            );
        }
        if (data.statusId) {
            validations.push(
                prisma.projectStatus.findUnique({ where: { id: data.statusId } }).then((status) => {
                    if (!status) throw new NotFoundError('Project status not found');
                })
            );
        }
        if (validations.length > 0) await Promise.all(validations);

        return await prisma.project.update({
            where: { id },
            data,
            include: projectDetailInclude,
        });
    },

    deleteProject: async (id: string) => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const now = new Date();
        await prisma.$transaction([
            prisma.projectTeamAssignment.updateMany({
                where: { projectId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.projectScheduleEntry.updateMany({
                where: { projectId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.primeContract.updateMany({
                where: { projectId: id, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.project.update({
                where: { id },
                data: { deletedAt: now },
            }),
        ]);
    },

    getTeam: async (projectId: string) => {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                leadPM: { select: { id: true, name: true, email: true } },
                teamMembers: {
                    where: { deletedAt: null },
                    include: { employee: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return {
            leadPM: project.leadPM,
            teamMembers: project.teamMembers,
        };
    },

    addTeamMember: async (projectId: string, data: TeamMemberRequest) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        if (data.employeeId === project.leadPMId) {
            throw new BadRequestError('This user is already the lead PM');
        }

        const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        // Upsert: restore soft-deleted, update existing, or create new
        const existing = await prisma.projectTeamAssignment.findUnique({
            where: { projectId_employeeId: { projectId, employeeId: data.employeeId } },
        });

        if (existing) {
            return await prisma.projectTeamAssignment.update({
                where: { projectId_employeeId: { projectId, employeeId: data.employeeId } },
                data: {
                    role: data.role ?? existing.role,
                    deletedAt: null,
                },
                include: { employee: { select: { id: true, name: true, email: true } } },
            });
        }

        return await prisma.projectTeamAssignment.create({
            data: {
                projectId,
                employeeId: data.employeeId,
                role: data.role || 'Member',
            },
            include: { employee: { select: { id: true, name: true, email: true } } },
        });
    },

    promoteTeamMember: async (projectId: string, employeeId: string, keepOldPM: boolean) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const assignment = await prisma.projectTeamAssignment.findUnique({
            where: { projectId_employeeId: { projectId, employeeId } },
        });
        if (!assignment || assignment.deletedAt) {
            throw new NotFoundError('Team member not found on this project');
        }

        const oldLeadPMId = project.leadPMId;

        return await prisma.$transaction(async (tx) => {
            // Soft-delete the promoted member's team assignment (they become lead PM)
            await tx.projectTeamAssignment.update({
                where: { projectId_employeeId: { projectId, employeeId } },
                data: { deletedAt: new Date() },
            });

            // Update project lead PM
            await tx.project.update({
                where: { id: projectId },
                data: { leadPMId: employeeId },
            });

            // Optionally demote old lead PM to team member
            if (keepOldPM && oldLeadPMId !== employeeId) {
                const existingOldPM = await tx.projectTeamAssignment.findUnique({
                    where: { projectId_employeeId: { projectId, employeeId: oldLeadPMId } },
                });
                if (existingOldPM) {
                    await tx.projectTeamAssignment.update({
                        where: { projectId_employeeId: { projectId, employeeId: oldLeadPMId } },
                        data: { role: 'Former Lead PM', deletedAt: null },
                    });
                } else {
                    await tx.projectTeamAssignment.create({
                        data: { projectId, employeeId: oldLeadPMId, role: 'Former Lead PM' },
                    });
                }
            }

            // Return updated project with team
            return await tx.project.findUniqueOrThrow({
                where: { id: projectId },
                include: {
                    ...projectDetailInclude,
                    leadPM: { select: { id: true, name: true, email: true, phoneNumber: true } },
                },
            });
        });
    },

    removeTeamMember: async (projectId: string, employeeId: string): Promise<void> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const assignment = await prisma.projectTeamAssignment.findUnique({
            where: { projectId_employeeId: { projectId, employeeId } },
        });
        if (!assignment || assignment.deletedAt) {
            throw new NotFoundError('Team member not found on this project');
        }

        await prisma.projectTeamAssignment.update({
            where: { projectId_employeeId: { projectId, employeeId } },
            data: { deletedAt: new Date() },
        });
    },

    // --- Prime Contract ---

    getPrimeContract: async (projectId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const contract = await prisma.primeContract.findUnique({
            where: { projectId },
        });
        if (!contract || contract.deletedAt) throw new NotFoundError('Prime contract not found');
        return contract;
    },

    upsertPrimeContract: async (projectId: string, data: PrimeContractUpsertRequest) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        // Validate executedContractDocId if provided
        if (data.executedContractDocId) {
            const file = await prisma.file.findUnique({
                where: { id: data.executedContractDocId },
            });
            if (!file) throw new NotFoundError('Executed contract document not found');
            checkDeletedAt(file);
        }

        return await prisma.$transaction(async (tx) => {
            const contract = await tx.primeContract.upsert({
                where: { projectId },
                create: {
                    id: ulid(),
                    projectId,
                    ...data,
                },
                update: {
                    ...data,
                    deletedAt: null,
                },
            });

            // Soft-delete old baseline entries before creating new ones
            if (
                data.estimatedStartDate !== undefined ||
                data.estimatedCompletionDate !== undefined
            ) {
                await tx.projectScheduleEntry.updateMany({
                    where: { projectId, changeOrderId: null, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            }

            // Create baseline schedule entries for dates if provided
            if (data.estimatedStartDate !== undefined) {
                await tx.projectScheduleEntry.create({
                    data: {
                        id: ulid(),
                        projectId,
                        date: new Date(),
                        description: 'Prime Contract: estimated start',
                        adjustedStartDate: data.estimatedStartDate,
                        changeOrderId: null,
                    },
                });
            }

            if (data.estimatedCompletionDate !== undefined) {
                await tx.projectScheduleEntry.create({
                    data: {
                        id: ulid(),
                        projectId,
                        date: new Date(),
                        description: 'Prime Contract: estimated completion',
                        adjustedFinishDate: data.estimatedCompletionDate,
                        changeOrderId: null,
                    },
                });
            }

            // Recalc if any dates were provided
            if (
                data.estimatedStartDate !== undefined ||
                data.estimatedCompletionDate !== undefined
            ) {
                await recalcProjectDates(projectId, tx);
            }

            return contract;
        });
    },

    // --- Schedule Entries ---

    listScheduleEntries: async (
        projectId: string,
        params: PaginationParams
    ): Promise<{ data: unknown[]; count: number }> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const { skip, take, sortBy, sortOrder } = params;
        const where = { projectId, deletedAt: null };

        const [count, data] = await prisma.$transaction([
            prisma.projectScheduleEntry.count({ where }),
            prisma.projectScheduleEntry.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: { file: { select: { id: true, name: true } } },
            }),
        ]);

        return { data, count };
    },

    createScheduleEntry: async (projectId: string, data: ScheduleEntryCreateRequest) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        if (data.fileId) {
            const file = await prisma.file.findUnique({ where: { id: data.fileId } });
            if (!file) throw new NotFoundError('File not found');
            checkDeletedAt(file);
        }

        return await prisma.$transaction(async (tx) => {
            const entry = await tx.projectScheduleEntry.create({
                data: {
                    id: ulid(),
                    projectId,
                    date: data.date,
                    description: data.description,
                    adjustedStartDate: data.adjustedStartDate,
                    adjustedFinishDate: data.adjustedFinishDate,
                    notes: data.notes,
                    fileId: data.fileId,
                },
                include: { file: { select: { id: true, name: true } } },
            });
            await recalcProjectDates(projectId, tx);
            return entry;
        });
    },

    updateScheduleEntry: async (
        projectId: string,
        entryId: string,
        data: ScheduleEntryUpdateRequest
    ) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const entry = await prisma.projectScheduleEntry.findFirst({
            where: { id: entryId, projectId, deletedAt: null },
        });
        if (!entry) throw new NotFoundError('Schedule entry not found');

        if (data.fileId) {
            const file = await prisma.file.findUnique({ where: { id: data.fileId } });
            if (!file) throw new NotFoundError('File not found');
            checkDeletedAt(file);
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.projectScheduleEntry.update({
                where: { id: entryId },
                data,
                include: { file: { select: { id: true, name: true } } },
            });
            await recalcProjectDates(projectId, tx);
            return updated;
        });
    },

    deleteScheduleEntry: async (projectId: string, entryId: string) => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const entry = await prisma.projectScheduleEntry.findFirst({
            where: { id: entryId, projectId, deletedAt: null },
        });
        if (!entry) throw new NotFoundError('Schedule entry not found');

        await prisma.$transaction(async (tx) => {
            await tx.projectScheduleEntry.update({
                where: { id: entryId },
                data: { deletedAt: new Date() },
            });
            await recalcProjectDates(projectId, tx);
        });
    },
};

export async function recalcProjectDates(projectId: string, tx?: TransactionClient) {
    const db = tx || prisma;

    // 1. Find latest baseline dates (entries NOT linked to a change order)
    const [latestBaselineStart, latestBaselineFinish] = await Promise.all([
        db.projectScheduleEntry.findFirst({
            where: {
                projectId,
                deletedAt: null,
                changeOrderId: null,
                adjustedStartDate: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            select: { adjustedStartDate: true },
        }),
        db.projectScheduleEntry.findFirst({
            where: {
                projectId,
                deletedAt: null,
                changeOrderId: null,
                adjustedFinishDate: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            select: { adjustedFinishDate: true },
        }),
    ]);

    // 2. Sum schedule impact days from all EXECUTED (non-voided) PCOs
    const pcoAgg = await db.primeChangeOrder.aggregate({
        where: {
            projectId,
            status: { name: 'EXECUTED' },
            deletedAt: null,
            impactsSchedule: true,
            scheduleImpactDays: { not: null },
        },
        _sum: { scheduleImpactDays: true },
    });
    const totalImpactDays = pcoAgg._sum.scheduleImpactDays || 0;

    // 3. Compute effective dates
    let effectiveEndDate: Date | null = null;
    if (latestBaselineFinish?.adjustedFinishDate) {
        effectiveEndDate = new Date(latestBaselineFinish.adjustedFinishDate);
        if (totalImpactDays > 0) {
            effectiveEndDate.setDate(effectiveEndDate.getDate() + totalImpactDays);
        }
    }

    const effectiveStartDate: Date | null = latestBaselineStart?.adjustedStartDate ?? null;

    // 4. Update project
    await db.project.update({
        where: { id: projectId },
        data: { effectiveStartDate, effectiveEndDate },
    });
}
