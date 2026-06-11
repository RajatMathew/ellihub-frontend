import { Employee, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { UserService } from '@modules/user/services';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddEmployeeDocumentRequest,
    EmployeeCreateRequest,
    EmployeeLinkUserRequest,
    EmployeeUpdateRequest,
    RemoveEmployeeDocumentRequest,
} from './models';

import type { PaginationParams } from '@middleware';

const employeeInclude = {
    department: true,
    role: true,
} satisfies Prisma.EmployeeInclude;

const employeeDetailInclude = {
    ...employeeInclude,
    documents: {
        include: {
            file: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.EmployeeInclude;

const employeeDocumentInclude = {
    file: true,
} satisfies Prisma.EmployeeDocumentInclude;

type EmployeeDetail = Prisma.EmployeeGetPayload<{ include: typeof employeeDetailInclude }>;
type EmployeeDocumentWithFile = Prisma.EmployeeDocumentGetPayload<{
    include: typeof employeeDocumentInclude;
}>;
type EmployeeProjectAssignment = {
    id: string;
    name: string;
    jobNumber: string | null;
    status: string;
    role: string | null;
    isLead: boolean;
    estimatedStartDate: Date | null;
    estimatedEndDate: Date | null;
    tcoDate: Date | null;
    gcName: string | null;
};

type EmployeeAuthRole = 'dev' | 'admin' | 'accountant' | 'pm' | 'user' | 'unlinked';

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

async function withEmployeeAuthRoles<T extends { userId?: string | null }>(employees: T[]) {
    const userIds = Array.from(
        new Set(employees.map((employee) => employee.userId).filter((id): id is string => !!id))
    );
    const users = userIds.length
        ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, role: true },
          })
        : [];
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

async function ensureProfessionalRoleExists(roleId?: string | null) {
    if (!roleId) return;

    const role = await prisma.lookup.findUnique({ where: { id: roleId } });
    if (!role || role.type !== LookupType.PROFESSIONAL_ROLE) {
        throw new NotFoundError('Professional role not found');
    }
}

async function ensureUserEmailAvailable(email: string, linkedUserId?: string | null) {
    const user = await prisma.user.findFirst({
        where: {
            email,
            ...(linkedUserId ? { NOT: { id: linkedUserId } } : {}),
        },
    });

    if (user) throw new ConflictError('A user with this email already exists');
}

async function assertAuthUserCanBeLinkedToEmployee(
    authUser: { id: string; profile?: string | null },
    employeeId: string
) {
    const linkedEmployee = await prisma.employee.findFirst({
        where: {
            deletedAt: null,
            id: { not: employeeId },
            OR: [{ userId: authUser.id }, ...(authUser.profile ? [{ id: authUser.profile }] : [])],
        },
        select: { name: true },
    });

    if (linkedEmployee) {
        throw new ConflictError(
            `A user with this email is already linked to employee ${linkedEmployee.name}`
        );
    }
}

export const EmployeeService = {
    create: async (
        request: EmployeeCreateRequest,
        userId: string,
        headers: Headers
    ): Promise<Employee> => {
        const existing = await prisma.employee.findFirst({
            where: { email: request.email, deletedAt: null },
        });
        if (existing) {
            throw new ConflictError('An employee with this email already exists');
        }

        await ensureProfessionalRoleExists(request.roleId);
        if (request.createAccount) await ensureUserEmailAvailable(request.email);

        const id = generateNanoId();
        let createdAuthUserId: string | undefined;

        try {
            return await prisma.$transaction(async (tx) => {
                let employee = await tx.employee.create({
                    data: {
                        id,
                        name: request.name,
                        email: request.email,
                        phoneNumber: request.phoneNumber,
                        address: request.address,
                        startDate: request.startDate,
                        emergencyContactName: request.emergencyContactName,
                        emergencyContactPhone: request.emergencyContactPhone,
                        emergencyContactRelation: request.emergencyContactRelation,
                        roleId: request.roleId ?? null,
                    },
                    include: employeeInclude,
                });

                if (request.createAccount) {
                    const authUser = await UserService.createUser(
                        {
                            email: request.email,
                            name: request.name,
                            password: request.password!,
                            role: request.authRole!,
                        },
                        headers,
                        tx,
                        employee.id
                    );
                    createdAuthUserId = authUser.id;
                    employee = await tx.employee.update({
                        where: { id: employee.id },
                        data: { userId: authUser.id },
                        include: employeeInclude,
                    });
                }

                await FileService.createEmployeeFolder(tx, employee.id, request.name, userId);

                await ActivityLogService.log({
                    userId,
                    entityType: 'employee',
                    entityId: employee.id,
                    action: 'create',
                    description: `Created employee ${employee.name}`,
                    tx,
                });

                return employee;
            });
        } catch (error) {
            if (createdAuthUserId) {
                await UserService.removeUser(createdAuthUserId, headers).catch((cleanupError) => {
                    console.error(
                        'Failed to clean up linked user after employee creation failed:',
                        cleanupError
                    );
                });
            }
            throw error;
        }
    },

    list: async (params: PaginationParams): Promise<{ data: Employee[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;

        const whereClause = {
            deletedAt: null,
            ...(filter || {}),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.employee.count({ where: whereClause }),
            prisma.employee.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof Employee]: sortOrder },
                include: employeeInclude,
            }),
        ]);

        return { data: await withEmployeeAuthRoles(data), count };
    },

    get: async (id: string): Promise<EmployeeDetail> => {
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: employeeDetailInclude,
        });
        if (!employee || employee.deletedAt) {
            throw new NotFoundError('Employee not found');
        }
        const [enriched] = await withEmployeeAuthRoles([employee]);
        return enriched;
    },

    getProjects: async (id: string): Promise<EmployeeProjectAssignment[]> => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee || employee.deletedAt) {
            throw new NotFoundError('Employee not found');
        }

        const [teamMemberships, leadProjects] = await Promise.all([
            prisma.projectTeamMember.findMany({
                where: { employeeId: id, project: { deletedAt: null } },
                include: {
                    project: {
                        include: {
                            gc: { select: { name: true } },
                        },
                    },
                },
                orderBy: { project: { name: 'asc' } },
            }),
            prisma.project.findMany({
                where: { leadPMId: id, deletedAt: null },
                include: {
                    gc: { select: { name: true } },
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        const assignments = new Map<string, EmployeeProjectAssignment>();

        for (const member of teamMemberships) {
            assignments.set(member.project.id, {
                id: member.project.id,
                name: member.project.name,
                jobNumber: member.project.jobNumber,
                status: member.project.status,
                role: member.role,
                isLead: member.isLead || member.project.leadPMId === id,
                estimatedStartDate: member.project.estimatedStartDate,
                estimatedEndDate: member.project.estimatedEndDate,
                tcoDate: member.project.tcoDate,
                gcName: member.project.gc?.name ?? null,
            });
        }

        for (const project of leadProjects) {
            const existing = assignments.get(project.id);
            if (existing) {
                assignments.set(project.id, { ...existing, role: 'Lead PM', isLead: true });
                continue;
            }

            assignments.set(project.id, {
                id: project.id,
                name: project.name,
                jobNumber: project.jobNumber,
                status: project.status,
                role: 'Lead PM',
                isLead: true,
                estimatedStartDate: project.estimatedStartDate,
                estimatedEndDate: project.estimatedEndDate,
                tcoDate: project.tcoDate,
                gcName: project.gc?.name ?? null,
            });
        }

        return [...assignments.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    update: async (request: EmployeeUpdateRequest, userId: string): Promise<Employee> => {
        const existing = await prisma.employee.findUnique({ where: { id: request.id } });
        if (!existing || existing.deletedAt) {
            throw new NotFoundError('Employee not found');
        }

        await ensureProfessionalRoleExists(request.roleId);

        const nameChanged = request.name !== existing.name;
        const emailChanged = request.email !== existing.email;

        if (emailChanged) {
            const dupEmployee = await prisma.employee.findFirst({
                where: { email: request.email, deletedAt: null, NOT: { id: request.id } },
            });
            if (dupEmployee) {
                throw new ConflictError('An employee with this email already exists');
            }

            if (existing.userId) await ensureUserEmailAvailable(request.email, existing.userId);
        }

        return await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.update({
                where: { id: request.id },
                data: {
                    name: request.name,
                    email: request.email,
                    phoneNumber: request.phoneNumber,
                    address: request.address,
                    startDate: request.startDate,
                    emergencyContactName: request.emergencyContactName,
                    emergencyContactPhone: request.emergencyContactPhone,
                    emergencyContactRelation: request.emergencyContactRelation,
                    roleId: request.roleId ?? null,
                },
                include: employeeInclude,
            });

            if (existing.userId && (nameChanged || emailChanged)) {
                await tx.user.update({
                    where: { id: existing.userId },
                    data: { name: request.name, email: request.email },
                });
            }

            if (nameChanged) {
                const folderId = await FileService.getEmployeeFolderId(employee.id, tx);
                await FileService.updateFolderDisplayName(folderId, request.name, tx);
            }

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: employee.id,
                action: 'update',
                description: `Updated employee ${employee.name}`,
                tx,
            });

            return employee;
        });
    },

    linkUser: async (
        employeeId: string,
        request: EmployeeLinkUserRequest,
        userId: string,
        headers: Headers
    ): Promise<Employee> => {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: employeeInclude,
        });
        if (!employee || employee.deletedAt) throw new NotFoundError('Employee not found');
        if (employee.userId)
            throw new ConflictError('Employee is already linked to a user account');

        const existingAuthUser = await prisma.user.findUnique({
            where: { email: employee.email },
            select: { id: true, profile: true },
        });

        let createdAuthUserId: string | undefined;
        try {
            let authUser: { id: string };

            if (existingAuthUser) {
                await assertAuthUserCanBeLinkedToEmployee(existingAuthUser, employee.id);
                authUser = await UserService.reactivateUserForEmployee(
                    existingAuthUser.id,
                    {
                        email: employee.email,
                        name: employee.name,
                        password: request.password,
                        role: request.role,
                    },
                    headers,
                    employee.id
                );
            } else {
                authUser = await UserService.createUser(
                    {
                        email: employee.email,
                        name: employee.name,
                        password: request.password,
                        role: request.role,
                    },
                    headers,
                    undefined,
                    employee.id
                );
                createdAuthUserId = authUser.id;
            }

            return await prisma.$transaction(async (tx) => {
                const updated = await tx.employee.update({
                    where: { id: employee.id },
                    data: { userId: authUser.id },
                    include: employeeInclude,
                });

                await ActivityLogService.log({
                    userId,
                    entityType: 'employee',
                    entityId: employee.id,
                    action: 'link',
                    description: existingAuthUser
                        ? `Re-linked employee ${employee.name} to an existing user account`
                        : `Linked employee ${employee.name} to a user account`,
                    affectedEntityIds: [authUser.id],
                    tx,
                });

                return updated;
            });
        } catch (error) {
            if (createdAuthUserId) {
                await UserService.removeUser(createdAuthUserId, headers).catch((cleanupError) => {
                    console.error(
                        'Failed to clean up linked user after link failed:',
                        cleanupError
                    );
                });
            }
            throw error;
        }
    },

    unlinkUser: async (employeeId: string, userId: string, headers: Headers): Promise<Employee> => {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: employeeInclude,
        });
        if (!employee || employee.deletedAt) throw new NotFoundError('Employee not found');
        if (!employee.userId) throw new BadRequestError('Employee is not linked to a user account');
        if (employee.userId === userId) {
            throw new BadRequestError('You cannot unlink your own user account');
        }

        const linkedUserId = employee.userId;
        await UserService.suspendUser(
            linkedUserId,
            { banReason: `Unlinked from employee ${employee.name}` },
            headers
        );

        return await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: linkedUserId },
                data: { profile: null },
            });

            const updated = await tx.employee.update({
                where: { id: employee.id },
                data: { userId: null },
                include: employeeInclude,
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: employee.id,
                action: 'unlink',
                description: `Unlinked user account from employee ${employee.name}`,
                affectedEntityIds: [linkedUserId],
                tx,
            });

            return updated;
        });
    },

    delete: async (id: string, userId: string, headers: Headers): Promise<void> => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);
        const linkedAuthUserId = employee.userId;
        if (linkedAuthUserId === userId) {
            throw new BadRequestError(
                'You cannot delete an employee linked to your own user account'
            );
        }

        const [leadProjects, teamMemberships] = await Promise.all([
            prisma.project.findMany({
                where: { leadPMId: id, deletedAt: null },
                select: { id: true, name: true },
            }),
            prisma.projectTeamMember.findMany({
                where: { employeeId: id, project: { deletedAt: null } },
                select: { projectId: true, project: { select: { id: true, name: true } } },
            }),
        ]);
        const affectedProjectIds = Array.from(
            new Set([
                ...leadProjects.map((project) => project.id),
                ...teamMemberships.map((member) => member.projectId),
            ])
        );
        if (affectedProjectIds.length) {
            const linkedProjectNames = Array.from(
                new Map(
                    [
                        ...leadProjects.map((project) => [project.id, project.name] as const),
                        ...teamMemberships.map(
                            (member) => [member.project.id, member.project.name] as const
                        ),
                    ].filter(([, name]) => !!name)
                ).values()
            );
            const projectName = linkedProjectNames[0] ?? 'a project';
            const projectText =
                affectedProjectIds.length === 1
                    ? `project ${projectName}`
                    : `${affectedProjectIds.length} projects, including ${projectName}`;
            throw new ConflictError(
                `Cannot delete employee because they are assigned to ${projectText}. Remove them from the project team or assign a different Lead PM first.`
            );
        }

        if (linkedAuthUserId) {
            const linkedUser = await prisma.user.findUnique({
                where: { id: linkedAuthUserId },
                select: { id: true },
            });

            if (linkedUser) await UserService.removeUser(linkedAuthUserId, headers);
        }

        await prisma.$transaction(async (tx) => {
            await tx.project.updateMany({
                where: { leadPMId: id },
                data: { leadPMId: null },
            });

            await tx.projectTeamMember.deleteMany({
                where: { employeeId: id },
            });

            await tx.employee.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    departmentId: null,
                    roleId: null,
                    userId: null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: id,
                action: 'delete',
                description: `Deleted employee ${employee.name}`,
                affectedEntityIds: linkedAuthUserId
                    ? [...affectedProjectIds, linkedAuthUserId]
                    : affectedProjectIds,
                tx,
            });
        });
    },

    addDocument: async (
        request: AddEmployeeDocumentRequest,
        userId: string
    ): Promise<EmployeeDocumentWithFile> => {
        const { employeeId, fileId, expiresOn } = request;

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee || employee.deletedAt) {
            throw new NotFoundError('Employee not found');
        }

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file || file.deletedAt) {
            throw new NotFoundError('File not found');
        }

        const existing = await prisma.employeeDocument.findUnique({
            where: { employeeId_fileId: { employeeId, fileId } },
        });
        if (existing) {
            throw new ConflictError('Document already linked to this employee');
        }

        return await prisma.$transaction(async (tx) => {
            const employeeFolderId = await FileService.getEmployeeFolderId(employeeId, tx);
            await FileService.moveFileToFolder(fileId, employeeFolderId, tx);

            const doc = await tx.employeeDocument.create({
                data: {
                    id: generateNanoId(),
                    employeeId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
                include: employeeDocumentInclude,
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: employeeId,
                action: 'link',
                description: `Linked document ${file.name} to employee ${employee.name}`,
                affectedEntityIds: [fileId],
                tx,
            });

            return doc;
        });
    },

    removeDocument: async (
        request: RemoveEmployeeDocumentRequest,
        userId: string
    ): Promise<void> => {
        const { employeeId, fileId } = request;

        const document = await prisma.employeeDocument.findUnique({
            where: { employeeId_fileId: { employeeId, fileId } },
            include: employeeDocumentInclude,
        });
        if (!document) {
            throw new NotFoundError('Employee document not found');
        }

        await prisma.employeeDocument.delete({ where: { id: document.id } });

        await ActivityLogService.log({
            userId,
            entityType: 'employee',
            entityId: employeeId,
            action: 'unlink',
            description: `Unlinked document ${document.file.name} from employee`,
            affectedEntityIds: [fileId],
        });
    },
};
