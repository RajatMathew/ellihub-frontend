import {
    CostCode,
    File,
    PrimeContract,
    Prisma,
    Project,
    ProjectSchedule,
    ProjectStatus,
    ProjectTeamMember,
} from '@db/client';
import { AccessContext, mergeProjectAccessWhere } from '@lib/access';
import { ProjectTeamRole } from '@lib/permissions';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware/pagination';
import {
    ActivityLogService,
    activityChange,
    buildUpdateActivityDescription,
    formatEnumActivityValue,
} from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { FieldwireClient } from '@modules/prime-change-order/fieldwire-client';
import { PrimeChangeOrderService } from '@modules/prime-change-order/service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddPrimeContractRequest,
    AddScheduleRequest,
    AddTeamMemberRequest,
    PinPrimeContractsRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    PromoteTeamMemberRequest,
    RemovePrimeContractRequest,
    RemoveScheduleRequest,
    RemoveTeamMemberRequest,
    SetPrimaryPrimeContractRequest,
    SetPrimeContractPrimaryRequest,
    UnpinPrimeContractsRequest,
    UpdateScheduleRequest,
    UpdateTeamMemberRoleRequest,
} from './models';

type ProjectListFinancialFields = {
    approvedChangeOrdersCount: number;
    approvedChangeOrdersTotal: number;
    revisedContractValue: number;
    totalPOCommitted: number;
    activePOsCount: number;
    approvedSCOsCount: number;
    approvedSCOTotal: number;
    totalSpent: number;
    budgetLimit: number;
    budgetRemaining: number;
    spendUtilization: number;
};

type ProjectStatusStatsItem = {
    id: ProjectStatus;
    label: string;
    count: number;
    totalContractValue: number;
};

type ProjectDivisionStatsItem = {
    id: string | null;
    label: string;
    count: number;
    totalContractValue: number;
};

type ProjectStats = {
    totalProjects: number;
    totalContractValue: number;
    statusSummary: ProjectStatusStatsItem[];
    divisionSummary: ProjectDivisionStatsItem[];
};

type ProjectWithListFinancials<T> = T & ProjectListFinancialFields;

type PrimeContractWithFile = Prisma.PrimeContractGetPayload<{ include: { file: true } }>;
type ProjectScheduleWithRelations = Prisma.ProjectScheduleGetPayload<{
    include: { file: true; primeChangeOrder: true };
}>;

type FieldwireProjectOption = {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    accountId: number;
    linkedProject: {
        id: string;
        name: string;
        jobNumber: string | null;
    } | null;
};

type FileDisplayNameInput = {
    id: string;
    name?: string | null;
    displayName?: string | null;
};

type EmployeeAuthRole = 'dev' | 'admin' | 'accountant' | 'pm' | 'user' | 'unlinked';

type EmployeeWithAuthRole<T> = T & {
    authUser: { id: string; role: string | null } | null;
    authRole: EmployeeAuthRole;
};

const PROJECT_CONTRACT_TYPE_LABELS = ['Lump Sum', 'GMP'];
const SCHEDULE_CREATE_DEDUPE_WINDOW_MS = 10_000;

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    CLOSED: 'Closed',
    COMPLETED: 'Completed',
};

const autoSyncLinkedFieldwireProject = async ({
    projectId,
    fieldwireProjectId,
    userId,
    reason,
}: {
    projectId: string;
    fieldwireProjectId: string | null | undefined;
    userId: string;
    reason: 'create' | 'update';
}) => {
    if (!fieldwireProjectId) return;

    try {
        await PrimeChangeOrderService.syncProject(projectId, 'MANUAL', userId);
    } catch (error) {
        console.error(
            `[project] failed to auto-sync Fieldwire project ${fieldwireProjectId} for project ${projectId} after ${reason}:`,
            error
        );
    }
};

function getFileDisplayName(file: FileDisplayNameInput) {
    return file.displayName || file.name || file.id;
}

function normalizeAuthRole(role: string | string[] | null | undefined): EmployeeAuthRole {
    const roles = Array.isArray(role)
        ? role
        : typeof role === 'string'
          ? role.split(',').map((value) => value.trim())
          : [];

    if (roles.includes('dev')) return 'dev';
    if (roles.includes('admin') || roles.includes('owner')) return 'admin';
    if (roles.includes('accountant')) return 'accountant';
    if (roles.includes('pm')) return 'pm';
    if (roles.includes('user')) return 'user';
    return 'unlinked';
}

async function ensureProjectContractTypeLookups(): Promise<void> {
    await Promise.all(
        PROJECT_CONTRACT_TYPE_LABELS.map((label) =>
            prisma.lookup.upsert({
                where: { type_label: { type: LookupType.PROJECT_CONTRACT_TYPE, label } },
                update: {},
                create: {
                    id: generateNanoId(),
                    type: LookupType.PROJECT_CONTRACT_TYPE,
                    label,
                },
            })
        )
    );
}

async function resolveProjectContractType(
    value: string | null | undefined
): Promise<string | null> {
    const contractType = value?.trim();
    if (!contractType) return null;

    await ensureProjectContractTypeLookups();

    const lookup = await prisma.lookup.findFirst({
        where: {
            type: LookupType.PROJECT_CONTRACT_TYPE,
            label: { equals: contractType, mode: 'insensitive' },
        },
        select: { label: true },
    });

    if (!lookup) {
        throw new BadRequestError('Contract type must be one of: Lump Sum, GMP');
    }

    return lookup.label;
}

async function withEmployeeAuthRoles<T extends { userId?: string | null }>(
    employees: T[]
): Promise<Array<EmployeeWithAuthRole<T>>> {
    const userIds = Array.from(
        new Set(employees.map((employee) => employee.userId).filter((id): id is string => !!id))
    );
    if (userIds.length === 0) {
        return employees.map((employee) => ({
            ...employee,
            authUser: null,
            authRole: 'unlinked',
        }));
    }

    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, role: true },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return employees.map((employee) => {
        const authUser = employee.userId ? (usersById.get(employee.userId) ?? null) : null;
        return {
            ...employee,
            authUser,
            authRole: normalizeAuthRole(authUser?.role),
        };
    });
}

async function getEmployeeAuthRole(employeeId: string): Promise<EmployeeAuthRole> {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true },
    });

    if (!employee?.userId) return 'unlinked';

    const user = await prisma.user.findUnique({
        where: { id: employee.userId },
        select: { role: true },
    });

    return normalizeAuthRole(user?.role);
}

async function assertProjectRoleEligibility(employeeId: string, role: ProjectTeamRole) {
    if (role === 'Member') return;

    const authRole = await getEmployeeAuthRole(employeeId);
    if (authRole !== 'pm') {
        throw new BadRequestError(`Only employees linked to an auth PM can be assigned ${role}`);
    }
}

async function assertLeadPMSelection(leadPMId: string, access?: AccessContext) {
    if (access?.role === 'pm') {
        if (!access.employeeId) {
            throw new BadRequestError('Your user account is not linked to an employee profile');
        }
        if (leadPMId !== access.employeeId) {
            throw new ForbiddenError('PM users must be the Lead PM on projects they create');
        }
    }

    await assertProjectRoleEligibility(leadPMId, 'Lead PM');
}

async function assertSchedulePrimeChangeOrder(
    projectId: string,
    primeChangeOrderId?: string | null,
    options: { allowDeleted?: boolean } = {}
) {
    if (!primeChangeOrderId) return;

    const primeChangeOrder = await prisma.primeChangeOrder.findUnique({
        where: { id: primeChangeOrderId },
        select: { projectId: true, deletedAt: true, fieldwireDeletedAt: true },
    });

    if (!primeChangeOrder) throw new NotFoundError('Prime change order not found');
    if (primeChangeOrder.projectId !== projectId) {
        throw new BadRequestError('Prime change order does not belong to this project');
    }
    if (
        !options.allowDeleted &&
        (primeChangeOrder.deletedAt || primeChangeOrder.fieldwireDeletedAt)
    ) {
        throw new BadRequestError(
            'Deleted prime change orders cannot be linked to schedule entries'
        );
    }
}

const getGroupedCount = (count: unknown): number => {
    if (typeof count === 'number') return count;
    if (!count || typeof count !== 'object' || !('_all' in count)) return 0;

    return Number((count as { _all?: number })._all ?? 0);
};

const getProjectYearRange = (year: unknown): { gte: Date; lt: Date } | undefined => {
    if (year === undefined || year === null || year === '') return undefined;

    const numericYear = Number(year);
    if (!Number.isInteger(numericYear) || numericYear < 1000 || numericYear > 9999) {
        return undefined;
    }

    return {
        gte: new Date(Date.UTC(numericYear, 0, 1)),
        lt: new Date(Date.UTC(numericYear + 1, 0, 1)),
    };
};

const getProjectYearWhere = (year: unknown): Prisma.ProjectWhereInput | undefined => {
    const range = getProjectYearRange(year);
    if (!range) return undefined;

    return {
        OR: [
            { tcoDate: range },
            {
                tcoDate: null,
                estimatedEndDate: range,
            },
        ],
    };
};

const getProjectSearchWhere = (search: string | undefined): Prisma.ProjectWhereInput | undefined =>
    search
        ? {
              OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { description: { contains: search, mode: 'insensitive' as const } },
                  { jobNumber: { contains: search, mode: 'insensitive' as const } },
                  { contractNumber: { contains: search, mode: 'insensitive' as const } },
                  { fieldwireProjectName: { contains: search, mode: 'insensitive' as const } },
                  { city: { contains: search, mode: 'insensitive' as const } },
                  { state: { contains: search, mode: 'insensitive' as const } },
              ],
          }
        : undefined;

const buildProjectListWhere = (
    params: Pick<PaginationParams, 'filter' | 'search'>,
    access?: AccessContext,
    options: { omitStatus?: boolean } = {}
): Prisma.ProjectWhereInput => {
    const { filter, search } = params;
    const { stageId, divisionId, division, gcId, leadPMId, status, statusId, year, ...restFilter } =
        filter || {};
    const projectYearWhere = getProjectYearWhere(year);
    const searchWhere = getProjectSearchWhere(search);
    const andWhere: Prisma.ProjectWhereInput[] = [];
    const statusFilter = options.omitStatus ? undefined : (status ?? statusId);

    if (projectYearWhere) andWhere.push(projectYearWhere);
    if (searchWhere) andWhere.push(searchWhere);
    if (division) {
        andWhere.push({ division: { label: { equals: division, mode: 'insensitive' } } });
    }

    const whereClause: Prisma.ProjectWhereInput = {
        deletedAt: null,
        ...restFilter,
        ...(stageId && { stageId }),
        ...(divisionId && { divisionId }),
        ...(gcId && { gcId }),
        ...(leadPMId && { leadPMId }),
        ...(statusFilter && { status: statusFilter }),
        ...(andWhere.length > 0 && { AND: andWhere }),
    };

    return access ? mergeProjectAccessWhere(access, whereClause) : whereClause;
};

const getProjectOrderBy = (
    sortBy: string,
    sortOrder: Prisma.SortOrder
): Prisma.ProjectOrderByWithRelationInput[] => {
    if (sortBy === 'tcoDate') {
        return [{ tcoDate: sortOrder }, { estimatedEndDate: sortOrder }, { createdAt: 'desc' }];
    }

    return [{ [sortBy]: sortOrder } as Prisma.ProjectOrderByWithRelationInput];
};

const getRevisedContractValueByProjectId = async <T extends Pick<Project, 'id' | 'contractValue'>>(
    projects: T[]
): Promise<Map<string, number>> => {
    if (projects.length === 0) return new Map();

    const approvedChangeOrderTotals = await prisma.primeChangeOrder.groupBy({
        by: ['projectId'],
        orderBy: { projectId: 'asc' },
        where: {
            projectId: { in: projects.map((project) => project.id) },
            deletedAt: null,
            statusName: 'Approved',
            totalCost: { not: null },
        },
        _sum: { totalCost: true },
    });

    const approvedTotalsByProjectId = new Map(
        approvedChangeOrderTotals.map((total) => [
            total.projectId,
            Number(total._sum.totalCost ?? new Prisma.Decimal(0)),
        ])
    );

    return new Map(
        projects.map((project) => [
            project.id,
            Number(project.contractValue ?? new Prisma.Decimal(0)) +
                (approvedTotalsByProjectId.get(project.id) ?? 0),
        ])
    );
};

const addProjectListFinancials = async <
    T extends Pick<Project, 'id' | 'contractValue' | 'targetBudgetPercent'>,
>(
    projects: T[]
): Promise<Array<ProjectWithListFinancials<T>>> => {
    if (projects.length === 0) return [];
    const projectIds = projects.map((project) => project.id);

    const [changeOrderTotals, purchaseOrderTotals, subChangeOrderTotals] =
        await prisma.$transaction([
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
                    status: { in: ['ISSUED', 'DELIVERED'] },
                },
                _count: { _all: true },
                _sum: { total: true },
            }),
            prisma.subChangeOrder.groupBy({
                by: ['projectId'],
                orderBy: { projectId: 'asc' },
                where: {
                    projectId: { in: projectIds },
                    deletedAt: null,
                    status: 'APPROVED',
                },
                _count: { _all: true },
                _sum: {
                    amount: true,
                    negotiatedDiscount: true,
                    shippingHandlingFee: true,
                    taxAmount: true,
                },
            }),
        ]);

    const changeOrderTotalsByProjectId = new Map(
        changeOrderTotals.map((total) => [total.projectId, total])
    );
    const purchaseOrderTotalsByProjectId = new Map(
        purchaseOrderTotals.map((total) => [total.projectId, total])
    );
    const subChangeOrderTotalsByProjectId = new Map(
        subChangeOrderTotals.map((total) => [total.projectId, total])
    );

    return projects.map((project) => {
        const approvedTotal = changeOrderTotalsByProjectId.get(project.id);
        const purchaseOrderTotal = purchaseOrderTotalsByProjectId.get(project.id);
        const subChangeOrderTotal = subChangeOrderTotalsByProjectId.get(project.id);
        const approvedChangeOrdersTotal = Number(
            approvedTotal?._sum?.totalCost ?? new Prisma.Decimal(0)
        );
        const contractValue = Number(project.contractValue ?? new Prisma.Decimal(0));
        const revisedContractValue = contractValue + approvedChangeOrdersTotal;
        const totalPOCommitted = Number(purchaseOrderTotal?._sum?.total ?? new Prisma.Decimal(0));
        const approvedSCOSubtotal = Number(
            subChangeOrderTotal?._sum?.amount ?? new Prisma.Decimal(0)
        );
        const approvedSCODiscount = Number(
            subChangeOrderTotal?._sum?.negotiatedDiscount ?? new Prisma.Decimal(0)
        );
        const approvedSCOShipping = Number(
            subChangeOrderTotal?._sum?.shippingHandlingFee ?? new Prisma.Decimal(0)
        );
        const approvedSCOTax = Number(
            subChangeOrderTotal?._sum?.taxAmount ?? new Prisma.Decimal(0)
        );
        const approvedSCOTotal =
            approvedSCOSubtotal - approvedSCODiscount + approvedSCOShipping + approvedSCOTax;
        const totalSpent = totalPOCommitted + approvedSCOTotal;
        const targetBudgetPercent = Number(project.targetBudgetPercent ?? 100);
        const budgetLimit = revisedContractValue * (targetBudgetPercent / 100);
        const spendUtilization = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

        return {
            ...project,
            approvedChangeOrdersCount: getGroupedCount(approvedTotal?._count),
            approvedChangeOrdersTotal,
            revisedContractValue,
            totalPOCommitted,
            activePOsCount: getGroupedCount(purchaseOrderTotal?._count),
            approvedSCOsCount: getGroupedCount(subChangeOrderTotal?._count),
            approvedSCOTotal,
            totalSpent,
            budgetLimit,
            budgetRemaining: budgetLimit - totalSpent,
            spendUtilization,
        };
    });
};

export const ProjectService = {
    getFieldwireProjects: async (): Promise<FieldwireProjectOption[]> => {
        const projects = await FieldwireClient.getProjects();
        const fieldwireProjectIds = projects.map((project) => project.id);
        const linkedProjects =
            fieldwireProjectIds.length > 0
                ? await prisma.project.findMany({
                      where: { fieldwireProjectId: { in: fieldwireProjectIds } },
                      select: {
                          id: true,
                          name: true,
                          jobNumber: true,
                          fieldwireProjectId: true,
                      },
                  })
                : [];
        const linkedProjectByFieldwireId = new Map(
            linkedProjects.map((project) => [project.fieldwireProjectId, project])
        );

        return projects
            .map((project) => {
                const linkedProject = linkedProjectByFieldwireId.get(project.id);

                return {
                    id: project.id,
                    name: project.name,
                    code: project.code,
                    address: project.address,
                    accountId: project.account_id,
                    linkedProject: linkedProject
                        ? {
                              id: linkedProject.id,
                              name: linkedProject.name,
                              jobNumber: linkedProject.jobNumber,
                          }
                        : null,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    getProjectCostCodes: async () => {
        return prisma.costCode.findMany({
            where: { deletedAt: null },
            include: { costCodeCategory: true },
            orderBy: [{ code: 'asc' }, { name: 'asc' }],
        });
    },

    getProjectCostCodeOptions: async (
        params: PaginationParams
    ): Promise<{ data: CostCode[]; count: number }> => {
        const { skip, take, search } = params;
        const whereClause: Prisma.CostCodeWhereInput = {
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.costCode.count({ where: whereClause }),
            prisma.costCode.findMany({
                where: whereClause,
                skip,
                take,
                include: { costCodeCategory: true },
                orderBy: [{ code: 'asc' }, { name: 'asc' }],
            }),
        ]);

        return { data, count };
    },

    getProjectEmployeeOptions: async () => {
        const employees = await prisma.employee.findMany({
            where: { deletedAt: null },
            include: {
                department: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        });
        return withEmployeeAuthRoles(employees);
    },

    getProjectStats: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<ProjectStats> => {
        const selectedWhereClause = buildProjectListWhere(params, access);
        const statusWhereClause = buildProjectListWhere(params, access, { omitStatus: true });

        const [selectedProjects, statusProjects] = await prisma.$transaction([
            prisma.project.findMany({
                where: selectedWhereClause,
                select: {
                    id: true,
                    contractValue: true,
                    division: { select: { id: true, label: true } },
                },
            }),
            prisma.project.findMany({
                where: statusWhereClause,
                select: {
                    id: true,
                    status: true,
                    contractValue: true,
                },
            }),
        ]);

        const [selectedContractValues, statusContractValues] = await Promise.all([
            getRevisedContractValueByProjectId(selectedProjects),
            getRevisedContractValueByProjectId(statusProjects),
        ]);

        const statusSummary = new Map<ProjectStatus, ProjectStatusStatsItem>();
        for (const project of statusProjects) {
            const existing = statusSummary.get(project.status);
            const totalContractValue = statusContractValues.get(project.id) ?? 0;

            if (existing) {
                existing.count += 1;
                existing.totalContractValue += totalContractValue;
            } else {
                statusSummary.set(project.status, {
                    id: project.status,
                    label: PROJECT_STATUS_LABELS[project.status] ?? project.status,
                    count: 1,
                    totalContractValue,
                });
            }
        }

        const divisionSummary = new Map<string, ProjectDivisionStatsItem>();
        let totalContractValue = 0;
        for (const project of selectedProjects) {
            const projectContractValue = selectedContractValues.get(project.id) ?? 0;
            totalContractValue += projectContractValue;

            const divisionId = project.division?.id ?? null;
            const divisionLabel = project.division?.label ?? 'Unassigned';
            const divisionKey = divisionId ?? divisionLabel;
            const existing = divisionSummary.get(divisionKey);

            if (existing) {
                existing.count += 1;
                existing.totalContractValue += projectContractValue;
            } else {
                divisionSummary.set(divisionKey, {
                    id: divisionId,
                    label: divisionLabel,
                    count: 1,
                    totalContractValue: projectContractValue,
                });
            }
        }

        return {
            totalProjects: selectedProjects.length,
            totalContractValue,
            statusSummary: Array.from(statusSummary.values()).sort((a, b) =>
                a.label.localeCompare(b.label)
            ),
            divisionSummary: Array.from(divisionSummary.values()).sort((a, b) =>
                a.label.localeCompare(b.label)
            ),
        };
    },

    createProject: async (
        request: ProjectCreateRequest,
        userId: string,
        access?: AccessContext
    ): Promise<Project> => {
        const {
            stageId,
            divisionId,
            gcId,
            leadPMId,
            estimatedStartDate,
            estimatedEndDate,
            actualStartDate,
            actualCompletionDate,
            setInactiveDate,
            tcoDate,
            fieldwireProjectId,
            fieldwireProjectName,
            contractType,
            ...rest
        } = request;

        const stage = await prisma.lookup.findUnique({ where: { id: stageId } });
        if (!stage) throw new NotFoundError('Project stage not found');

        const division = await prisma.lookup.findUnique({ where: { id: divisionId } });
        if (!division) throw new NotFoundError('Project division not found');

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) throw new NotFoundError('General contractor not found');

        const leadPM = await prisma.employee.findUnique({ where: { id: leadPMId } });
        if (!leadPM) throw new NotFoundError('Lead PM not found');
        await assertLeadPMSelection(leadPMId, access);

        const resolvedContractType = await resolveProjectContractType(contractType);

        if (fieldwireProjectId) {
            const existing = await prisma.project.findUnique({ where: { fieldwireProjectId } });
            if (existing) throw new ConflictError('Fieldwire project ID already exists');
        }

        const project = await prisma.$transaction(async (tx) => {
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

            const id = generateNanoId();

            const project = await tx.project.create({
                data: {
                    ...rest,
                    id,
                    jobNumber,
                    stageId,
                    divisionId,
                    gcId,
                    leadPMId,
                    contractType: resolvedContractType,
                    fieldwireProjectId: fieldwireProjectId ?? null,
                    fieldwireProjectName: fieldwireProjectId
                        ? (fieldwireProjectName?.trim() ?? null)
                        : null,
                    estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
                    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
                    actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
                    actualCompletionDate: actualCompletionDate
                        ? new Date(actualCompletionDate)
                        : null,
                    setInactiveDate: setInactiveDate ? new Date(setInactiveDate) : null,
                    tcoDate: new Date(tcoDate),
                },
            });

            await tx.projectTeamMember.create({
                data: {
                    employeeId: leadPMId,
                    projectId: project.id,
                    role: 'Lead PM',
                    isLead: true,
                },
            });

            await FileService.createProjectFolders(tx, project.id, project.name, userId);

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: project.id,
                action: 'create',
                description: `Created project ${project.name} (${project.jobNumber})`,
                affectedEntityIds: [gcId],
                tx,
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: leadPMId,
                action: 'link',
                description: `Assigned ${leadPM.name} to project ${project.name} as Lead PM`,
                affectedEntityIds: [project.id],
                tx,
            });

            return project;
        });

        await autoSyncLinkedFieldwireProject({
            projectId: project.id,
            fieldwireProjectId: project.fieldwireProjectId,
            userId,
            reason: 'create',
        });

        return project;
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

        const enrichedLeadPM = project.leadPM
            ? (await withEmployeeAuthRoles([project.leadPM]))[0]
            : null;
        const enrichedTeamEmployees = await withEmployeeAuthRoles(
            project.teamMembers.map((member) => member.employee).filter(Boolean)
        );
        const employeeById = new Map(
            enrichedTeamEmployees.map((employee) => [employee.id, employee])
        );

        return {
            ...project,
            leadPM: enrichedLeadPM,
            teamMembers: project.teamMembers.map((member) => ({
                ...member,
                employee: member.employee ? employeeById.get(member.employee.id) : member.employee,
            })),
        } as Project;
    },

    getProjects: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<{
        data: Project[];
        count: number;
    }> => {
        const { skip, take, sortBy, sortOrder } = params;
        const scopedWhereClause = buildProjectListWhere(params, access);

        const [count, data] = await prisma.$transaction([
            prisma.project.count({ where: scopedWhereClause }),

            prisma.project.findMany({
                where: scopedWhereClause,
                skip,
                take,
                orderBy: getProjectOrderBy(sortBy, sortOrder),
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
            actualStartDate,
            actualCompletionDate,
            setInactiveDate,
            tcoDate,
            jobNumber,
            fieldwireProjectId,
            fieldwireProjectName,
            contractType,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                stage: true,
                division: true,
                gc: true,
                leadPM: true,
            },
        });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const stage = await prisma.lookup.findUnique({ where: { id: stageId } });
        if (!stage) throw new NotFoundError('Project stage not found');

        const division = await prisma.lookup.findUnique({ where: { id: divisionId } });
        if (!division) throw new NotFoundError('Project division not found');

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) throw new NotFoundError('General contractor not found');

        const leadPM = await prisma.employee.findUnique({ where: { id: leadPMId } });
        if (!leadPM) throw new NotFoundError('Lead PM not found');
        await assertProjectRoleEligibility(leadPMId, 'Lead PM');

        const resolvedContractType = await resolveProjectContractType(contractType);

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

        const nextFieldwireProjectId = fieldwireProjectId ?? null;
        const hasFieldwireProjectChanged = nextFieldwireProjectId !== project.fieldwireProjectId;
        const nextLeadPMId = leadPMId;

        const updatedProject = await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, { entityType: 'PROJECT', entityId: id, userId });

            const updated = await tx.project.update({
                where: { id },
                data: {
                    ...rest,
                    jobNumber: jobNumber ?? project.jobNumber,
                    stageId,
                    divisionId,
                    gcId,
                    leadPMId: nextLeadPMId,
                    contractType: resolvedContractType,
                    fieldwireProjectId: nextFieldwireProjectId,
                    fieldwireProjectName: nextFieldwireProjectId
                        ? (fieldwireProjectName?.trim() ??
                          (nextFieldwireProjectId === project.fieldwireProjectId
                              ? project.fieldwireProjectName
                              : null))
                        : null,
                    estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
                    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
                    actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
                    actualCompletionDate: actualCompletionDate
                        ? new Date(actualCompletionDate)
                        : null,
                    setInactiveDate: setInactiveDate ? new Date(setInactiveDate) : null,
                    tcoDate: new Date(tcoDate),
                },
            });

            await tx.projectTeamMember.updateMany({
                where: {
                    projectId: id,
                    employeeId: { not: nextLeadPMId },
                    OR: [
                        { isLead: true },
                        ...(project.leadPMId ? [{ employeeId: project.leadPMId }] : []),
                    ],
                },
                data: { isLead: false, role: 'PM' },
            });

            await tx.projectTeamMember.upsert({
                where: { employeeId_projectId: { employeeId: nextLeadPMId, projectId: id } },
                update: { isLead: true, role: 'Lead PM' },
                create: {
                    employeeId: nextLeadPMId,
                    projectId: id,
                    role: 'Lead PM',
                    isLead: true,
                },
            });

            if (updated.name !== project.name) {
                const folderId = await FileService.getProjectFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, updated.name, tx);
            }

            if (hasFieldwireProjectChanged) {
                await PrimeChangeOrderService.resetAfterFieldwireProjectChange({
                    projectId: id,
                    fieldwireProjectId: nextFieldwireProjectId,
                    tx,
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: id,
                action: 'update',
                description: buildUpdateActivityDescription(`project ${updated.name}`, [
                    activityChange('Name', project.name, updated.name),
                    activityChange('Description', project.description, updated.description),
                    activityChange('Job number', project.jobNumber, updated.jobNumber),
                    activityChange(
                        'Contract number',
                        project.contractNumber,
                        updated.contractNumber
                    ),
                    activityChange('Stage', project.stage.label, stage.label),
                    activityChange('Division', project.division.label, division.label),
                    activityChange('General contractor', project.gc.name, gc.name),
                    activityChange('Lead PM', project.leadPM?.name, leadPM.name),
                    activityChange('Street address', project.streetAddress, updated.streetAddress),
                    activityChange('City', project.city, updated.city),
                    activityChange('State', project.state, updated.state),
                    activityChange('ZIP code', project.zipCode, updated.zipCode),
                    activityChange(
                        'Estimated start date',
                        project.estimatedStartDate,
                        updated.estimatedStartDate
                    ),
                    activityChange(
                        'Estimated end date',
                        project.estimatedEndDate,
                        updated.estimatedEndDate
                    ),
                    activityChange(
                        'Actual start date',
                        project.actualStartDate,
                        updated.actualStartDate
                    ),
                    activityChange(
                        'Actual completion date',
                        project.actualCompletionDate,
                        updated.actualCompletionDate
                    ),
                    activityChange(
                        'Inactive date',
                        project.setInactiveDate,
                        updated.setInactiveDate
                    ),
                    activityChange('TCO date', project.tcoDate, updated.tcoDate),
                    activityChange('Contract value', project.contractValue, updated.contractValue),
                    activityChange('Contract type', project.contractType, updated.contractType),
                    activityChange(
                        'Retainage percent',
                        project.retainagePercent,
                        updated.retainagePercent
                    ),
                    activityChange(
                        'Target budget percent',
                        project.targetBudgetPercent,
                        updated.targetBudgetPercent
                    ),
                    activityChange('Tax rate', project.taxRate, updated.taxRate),
                    activityChange(
                        'Payment terms',
                        project.paymentTerms,
                        updated.paymentTerms,
                        formatEnumActivityValue
                    ),
                    activityChange(
                        'Fieldwire project ID',
                        project.fieldwireProjectId,
                        updated.fieldwireProjectId
                    ),
                    activityChange(
                        'Fieldwire project name',
                        project.fieldwireProjectName,
                        updated.fieldwireProjectName
                    ),
                ]),
                affectedEntityIds: [
                    gcId,
                    leadPMId,
                    ...(project.gcId !== gcId ? [project.gcId] : []),
                    ...(project.leadPMId && project.leadPMId !== leadPMId
                        ? [project.leadPMId]
                        : []),
                ],
                tx,
            });

            return updated;
        });

        await autoSyncLinkedFieldwireProject({
            projectId: updatedProject.id,
            fieldwireProjectId: hasFieldwireProjectChanged
                ? updatedProject.fieldwireProjectId
                : null,
            userId,
            reason: 'update',
        });

        return updatedProject;
    },

    getProjectSchedules: async (projectId: string): Promise<ProjectScheduleWithRelations[]> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return await prisma.projectSchedule.findMany({
            where: { projectId, deletedAt: null },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
            include: { file: true, primeChangeOrder: true },
        });
    },

    addSchedule: async (request: AddScheduleRequest, userId: string): Promise<ProjectSchedule> => {
        const { projectId, fileId, primeChangeOrderId, date, adjustedFinishDate, ...rest } =
            request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        await assertSchedulePrimeChangeOrder(projectId, primeChangeOrderId);

        const scheduleDate = new Date(date);
        const scheduleAdjustedFinishDate = adjustedFinishDate ? new Date(adjustedFinishDate) : null;
        const recentDuplicate = await prisma.projectSchedule.findFirst({
            where: {
                projectId,
                deletedAt: null,
                date: scheduleDate,
                description: rest.description,
                adjustedFinishDate: scheduleAdjustedFinishDate,
                notes: rest.notes ?? null,
                fileId: fileId ?? null,
                primeChangeOrderId: primeChangeOrderId ?? null,
                createdAt: {
                    gte: new Date(Date.now() - SCHEDULE_CREATE_DEDUPE_WINDOW_MS),
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (recentDuplicate) return recentDuplicate;

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
                    id: generateNanoId(),
                    projectId,
                    ...(fileId ? { fileId } : {}),
                    primeChangeOrderId: primeChangeOrderId ?? null,
                    date: scheduleDate,
                    adjustedFinishDate: scheduleAdjustedFinishDate,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'create',
                description: `Added schedule entry to project ${project.name}`,
                affectedEntityIds: [
                    schedule.id,
                    ...(fileId ? [fileId] : []),
                    ...(primeChangeOrderId ? [primeChangeOrderId] : []),
                ],
                tx,
            });

            return schedule;
        });
    },

    updateSchedule: async (
        request: UpdateScheduleRequest,
        userId: string
    ): Promise<ProjectSchedule> => {
        const { id, fileId, primeChangeOrderId, date, adjustedFinishDate, ...rest } = request;

        const schedule = await prisma.projectSchedule.findUnique({
            where: { id },
            include: { project: true, file: true, primeChangeOrder: true },
        });
        if (!schedule) throw new NotFoundError('Schedule not found');
        checkDeletedAt(schedule);
        await assertSchedulePrimeChangeOrder(schedule.projectId, primeChangeOrderId, {
            allowDeleted: primeChangeOrderId === schedule.primeChangeOrderId,
        });

        let nextFile = fileId === schedule.fileId ? schedule.file : null;
        if (fileId && fileId !== schedule.fileId) {
            nextFile = await prisma.file.findUnique({ where: { id: fileId } });
            if (!nextFile) throw new NotFoundError('File not found');
            checkDeletedAt(nextFile);

            const existing = await prisma.projectSchedule.findUnique({ where: { fileId } });
            if (existing) throw new ConflictError('File already attached to a schedule');
        }
        const nextPrimeChangeOrder =
            primeChangeOrderId && primeChangeOrderId !== schedule.primeChangeOrderId
                ? await prisma.primeChangeOrder.findUnique({ where: { id: primeChangeOrderId } })
                : primeChangeOrderId
                  ? schedule.primeChangeOrder
                  : null;
        const formatSchedulePrimeChangeOrder = (
            value: { referenceNumber: string | null; name: string } | null
        ) => (value ? [value.referenceNumber, value.name].filter(Boolean).join(' - ') : null);

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
                    primeChangeOrderId: primeChangeOrderId ?? null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: schedule.projectId,
                action: 'update',
                description: buildUpdateActivityDescription(
                    `schedule entry on project ${schedule.project.name}`,
                    [
                        activityChange('Date', schedule.date, updated.date),
                        activityChange('Description', schedule.description, updated.description),
                        activityChange(
                            'Adjusted finish date',
                            schedule.adjustedFinishDate,
                            updated.adjustedFinishDate
                        ),
                        activityChange('Notes', schedule.notes, updated.notes),
                        activityChange(
                            'File',
                            getFileDisplayName(schedule.file ?? { id: schedule.fileId ?? '' }),
                            getFileDisplayName(nextFile ?? { id: fileId ?? '' })
                        ),
                        activityChange(
                            'Prime change order',
                            formatSchedulePrimeChangeOrder(schedule.primeChangeOrder),
                            formatSchedulePrimeChangeOrder(nextPrimeChangeOrder)
                        ),
                    ]
                ),
                affectedEntityIds: [
                    schedule.id,
                    ...(fileId ? [fileId] : []),
                    ...(schedule.fileId && schedule.fileId !== fileId ? [schedule.fileId] : []),
                    ...(primeChangeOrderId ? [primeChangeOrderId] : []),
                    ...(schedule.primeChangeOrderId &&
                    schedule.primeChangeOrderId !== primeChangeOrderId
                        ? [schedule.primeChangeOrderId]
                        : []),
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
        const { projectId, employeeId, isLead } = request;
        const role: ProjectTeamRole = isLead ? 'Lead PM' : request.role;

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
        await assertProjectRoleEligibility(employeeId, role);

        return await prisma.$transaction(async (tx) => {
            if (role === 'Lead PM') {
                await tx.projectTeamMember.updateMany({
                    where: {
                        projectId,
                        OR: [
                            { isLead: true },
                            ...(project.leadPMId ? [{ employeeId: project.leadPMId }] : []),
                        ],
                    },
                    data: { isLead: false, role: 'PM' },
                });
                await tx.project.update({
                    where: { id: projectId },
                    data: { leadPMId: employeeId },
                });
            }

            const member = await tx.projectTeamMember.create({
                data: { projectId, employeeId, role, isLead: role === 'Lead PM' },
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

    promoteTeamMember: async (
        request: PromoteTeamMemberRequest,
        userId: string
    ): Promise<ProjectTeamMember> => {
        return ProjectService.updateTeamMemberRole({ ...request, role: 'Lead PM' }, userId);
    },

    updateTeamMemberRole: async (
        request: UpdateTeamMemberRoleRequest,
        userId: string
    ): Promise<ProjectTeamMember> => {
        const { projectId, employeeId } = request;
        const nextRole = request.role as ProjectTeamRole;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const member = await prisma.projectTeamMember.findUnique({
            where: { employeeId_projectId: { employeeId, projectId } },
            include: { employee: true },
        });
        if (!member) throw new NotFoundError('Team member not found');
        await assertProjectRoleEligibility(employeeId, nextRole);

        if ((member.isLead || project.leadPMId === employeeId) && nextRole !== 'Lead PM') {
            throw new BadRequestError('Transfer Lead PM before changing this member role');
        }

        return await prisma.$transaction(async (tx) => {
            if (nextRole === 'Lead PM') {
                await tx.projectTeamMember.updateMany({
                    where: {
                        projectId,
                        employeeId: { not: employeeId },
                        OR: [
                            { isLead: true },
                            ...(project.leadPMId ? [{ employeeId: project.leadPMId }] : []),
                        ],
                    },
                    data: { isLead: false, role: 'PM' },
                });

                await tx.project.update({
                    where: { id: projectId },
                    data: { leadPMId: employeeId },
                });
            }

            const updatedMember = await tx.projectTeamMember.update({
                where: { employeeId_projectId: { employeeId, projectId } },
                data: { isLead: nextRole === 'Lead PM', role: nextRole },
                include: { employee: true },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: projectId,
                action: 'update',
                description:
                    nextRole === 'Lead PM'
                        ? `Transferred Lead PM on project ${project.name} to ${member.employee.name}`
                        : `Changed ${member.employee.name}'s project role from ${member.role} to ${nextRole} on ${project.name}`,
                affectedEntityIds: [
                    employeeId,
                    ...(project.leadPMId && project.leadPMId !== employeeId
                        ? [project.leadPMId]
                        : []),
                ],
                tx,
            });

            return updatedMember;
        });
    },

    removeTeamMember: async (
        request: RemoveTeamMemberRequest,
        userId: string,
        access?: AccessContext
    ): Promise<void> => {
        const { projectId, employeeId } = request;

        const member = await prisma.projectTeamMember.findUnique({
            where: { employeeId_projectId: { employeeId, projectId } },
            include: { project: true, employee: true },
        });
        if (!member) throw new NotFoundError('Team member not found');
        if (member.isLead || member.project.leadPMId === employeeId) {
            throw new ConflictError('Cannot remove the Lead PM. Transfer Lead PM first.');
        }
        if (!access?.isAdmin && member.role === 'PM') {
            throw new ForbiddenError('Only admins can remove a project PM');
        }

        await prisma.$transaction(async (tx) => {
            await tx.projectTeamMember.delete({
                where: { employeeId_projectId: { employeeId, projectId } },
            });

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
        const [primeContract] = await ProjectService.pinPrimeContracts(
            { projectId: request.projectId, fileIds: [request.fileId] },
            userId
        );

        if (!primeContract) throw new NotFoundError('Prime contract not found');
        return primeContract;
    },

    pinPrimeContracts: async (
        request: PinPrimeContractsRequest,
        userId: string
    ): Promise<PrimeContractWithFile[]> => {
        const { projectId } = request;
        const fileIds = Array.from(new Set(request.fileIds));

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(
                projectId,
                'PRIME_CONTRACT',
                tx
            );

            const files = await tx.file.findMany({
                where: { id: { in: fileIds }, deletedAt: null },
            });

            if (files.length !== fileIds.length) throw new NotFoundError('File not found');

            const invalidFile = files.find(
                (file) => file.type !== 'FILE' || file.parentId !== folderId
            );
            if (invalidFile) {
                throw new BadRequestError(
                    'Only files inside this project Prime Contract folder can be pinned'
                );
            }

            const existing = await tx.primeContract.findMany({
                where: { projectId, fileId: { in: fileIds } },
                select: { fileId: true },
            });
            if (existing.length > 0) {
                throw new ConflictError('One or more files are already pinned as prime contracts');
            }

            const pinned: PrimeContractWithFile[] = [];

            for (const file of files) {
                await tx.file.update({
                    where: { id: file.id },
                    data: { isDeletable: false },
                });

                const primeContract = await tx.primeContract.create({
                    data: { id: generateNanoId(), projectId, fileId: file.id, isPrimary: false },
                    include: { file: true },
                });
                pinned.push(primeContract);

                await ActivityLogService.log({
                    userId,
                    entityType: 'project',
                    entityId: projectId,
                    action: 'link',
                    description: `Pinned prime contract ${getFileDisplayName(file)} to project ${project.name}`,
                    affectedEntityIds: [file.id, primeContract.id],
                    tx,
                });
            }

            return pinned;
        });
    },

    getProjectPrimeContracts: async (projectId: string): Promise<PrimeContractWithFile[]> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        return await prisma.primeContract.findMany({
            where: { projectId, file: { deletedAt: null } },
            orderBy: [{ uploadedAt: 'desc' }],
            include: { file: true },
        });
    },

    getProjectPrimeContractCandidates: async (projectId: string): Promise<File[]> => {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const folderId = await FileService.getProjectSubFolderId(projectId, 'PRIME_CONTRACT');

        return await prisma.file.findMany({
            where: {
                parentId: folderId,
                type: 'FILE',
                deletedAt: null,
                primeContracts: { none: { projectId } },
            },
            orderBy: [{ name: 'asc' }],
        });
    },

    setPrimaryPrimeContract: async (
        request: SetPrimaryPrimeContractRequest,
        userId: string
    ): Promise<PrimeContract> => {
        const [primeContract] = await ProjectService.setPrimeContractPrimary(
            {
                projectId: request.projectId,
                primeContractIds: [request.primeContractId],
                isPrimary: true,
            },
            userId
        );

        if (!primeContract) throw new NotFoundError('Prime contract not found');
        return primeContract;
    },

    setPrimeContractPrimary: async (
        request: SetPrimeContractPrimaryRequest,
        userId: string
    ): Promise<PrimeContractWithFile[]> => {
        const { projectId, isPrimary } = request;
        const primeContractIds = Array.from(new Set(request.primeContractIds));

        const primeContracts = await prisma.primeContract.findMany({
            where: { id: { in: primeContractIds }, projectId },
            include: { project: true, file: true },
        });

        if (primeContracts.length !== primeContractIds.length)
            throw new NotFoundError('Prime contract not found');

        for (const primeContract of primeContracts) {
            checkDeletedAt(primeContract.project);
        }

        return await prisma.$transaction(async (tx) => {
            await tx.primeContract.updateMany({
                where: { id: { in: primeContractIds }, projectId },
                data: { isPrimary },
            });

            const updated = await tx.primeContract.findMany({
                where: { id: { in: primeContractIds }, projectId },
                include: { file: true },
            });

            for (const primeContract of primeContracts) {
                await ActivityLogService.log({
                    userId,
                    entityType: 'project',
                    entityId: projectId,
                    action: 'update',
                    description: isPrimary
                        ? `Marked prime contract ${getFileDisplayName(
                              primeContract.file
                          )} as primary for project ${primeContract.project.name}`
                        : `Removed primary mark from prime contract ${getFileDisplayName(
                              primeContract.file
                          )} for project ${primeContract.project.name}`,
                    affectedEntityIds: [primeContract.fileId, primeContract.id],
                    tx,
                });
            }

            return updated;
        });
    },

    removePrimeContract: async (
        request: RemovePrimeContractRequest,
        userId: string
    ): Promise<void> => {
        await ProjectService.unpinPrimeContracts(
            { projectId: request.projectId, primeContractIds: [request.primeContractId] },
            userId
        );
    },

    unpinPrimeContracts: async (
        request: UnpinPrimeContractsRequest,
        userId: string
    ): Promise<void> => {
        const { projectId } = request;
        const primeContractIds = Array.from(new Set(request.primeContractIds));
        const primeContracts = await prisma.primeContract.findMany({
            where: { projectId, id: { in: primeContractIds } },
            include: { project: true, file: true },
        });

        if (primeContracts.length !== primeContractIds.length)
            throw new NotFoundError('Prime contract not found');

        for (const primeContract of primeContracts) {
            checkDeletedAt(primeContract.project);
        }

        await prisma.$transaction(async (tx) => {
            await tx.primeContract.deleteMany({
                where: { id: { in: primeContractIds }, projectId },
            });

            for (const primeContract of primeContracts) {
                await ActivityLogService.log({
                    userId,
                    entityType: 'project',
                    entityId: projectId,
                    action: 'unlink',
                    description: `Unpinned prime contract ${getFileDisplayName(
                        primeContract.file
                    )} from project ${primeContract.project.name}`,
                    affectedEntityIds: [primeContract.fileId, primeContract.id],
                    tx,
                });
            }
        });
    },

    deleteProject: async (id: string, userId: string): Promise<void> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, { entityType: 'PROJECT', entityId: id, userId });

            await tx.project.update({
                where: { id },
                data: { deletedAt: new Date() },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'project',
                entityId: id,
                action: 'delete',
                description: `Deleted project ${project.name}`,
                affectedEntityIds: [
                    ...(project.gcId ? [project.gcId] : []),
                    ...(project.leadPMId ? [project.leadPMId] : []),
                ],
                tx,
            });
        });
    },

    setActive: async (id: string, userId: string): Promise<Project> => {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const updated = await prisma.project.update({
            where: { id },
            data: { status: 'ACTIVE' },
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
            data: { status: 'COMPLETED' },
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
        const { stageId, divisionId, gcId, status, year, ...restFilter } = filter || {};
        const projectYearWhere = getProjectYearWhere(year);
        const searchWhere = getProjectSearchWhere(search);
        const andWhere: Prisma.ProjectWhereInput[] = [];
        if (projectYearWhere) andWhere.push(projectYearWhere);
        if (searchWhere) andWhere.push(searchWhere);

        const whereClause: Prisma.ProjectWhereInput = {
            deletedAt: null,
            teamMembers: { some: { employeeId } },
            ...restFilter,
            ...(stageId && { stageId }),
            ...(divisionId && { divisionId }),
            ...(gcId && { gcId }),
            ...(status && { status }),
            ...(andWhere.length > 0 && { AND: andWhere }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.project.count({ where: whereClause }),

            prisma.project.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: getProjectOrderBy(sortBy, sortOrder),
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
