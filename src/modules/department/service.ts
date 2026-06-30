import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService, activityChange } from '@modules/activity-log';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    DepartmentAssignEmployeeRequest,
    DepartmentCreateRequest,
    DepartmentRemoveEmployeeRequest,
    DepartmentUpdateRequest,
} from './models';

export const DepartmentService = {
    list: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, ...restFilter } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
        };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
            ];
        }

        const orderBy =
            sortBy === 'employeeCount'
                ? { employees: { _count: sortOrder } }
                : { [sortBy as string]: sortOrder };

        const [count, data] = await prisma.$transaction([
            prisma.department.count({ where: whereClause }),
            prisma.department.findMany({
                where: whereClause,
                skip,
                take,
                orderBy,
                include: {
                    _count: {
                        select: {
                            employees: {
                                where: {
                                    deletedAt: null,
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            data: data.map(({ _count, ...department }) => ({
                ...department,
                employeeCount: _count.employees,
            })),
            count,
        };
    },

    getStats: async () => {
        const [totalDepartments, assignedEmployees, unassignedEmployees, departments] =
            await prisma.$transaction([
                prisma.department.count({ where: { deletedAt: null } }),
                prisma.employee.count({ where: { deletedAt: null, departmentId: { not: null } } }),
                prisma.employee.count({ where: { deletedAt: null, departmentId: null } }),
                prisma.department.findMany({
                    where: { deletedAt: null },
                    select: {
                        _count: {
                            select: {
                                employees: {
                                    where: { deletedAt: null },
                                },
                            },
                        },
                    },
                }),
            ]);

        return {
            totalDepartments,
            assignedEmployees,
            unassignedEmployees,
            emptyDepartments: departments.filter((department) => department._count.employees === 0)
                .length,
        };
    },

    get: async (id: string) => {
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                employees: { include: { role: true } },
            },
        });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);
        return department;
    },

    create: async (request: DepartmentCreateRequest, userId: string) => {
        const existing = await prisma.department.findFirst({
            where: { name: request.name, deletedAt: null },
        });
        if (existing) {
            throw new ConflictError('A department with this name already exists');
        }

        return await prisma.$transaction(async (tx) => {
            const department = await tx.department.create({
                data: {
                    id: generateNanoId(),
                    name: request.name,
                    description: request.description,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'department',
                entityId: department.id,
                action: 'create',
                description: `Created department ${department.name}`,
                tx,
            });

            return department;
        });
    },

    update: async (request: DepartmentUpdateRequest, userId: string) => {
        const { id, ...data } = request;

        const department = await prisma.department.findUnique({ where: { id } });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);

        if (data.name && data.name !== department.name) {
            const existing = await prisma.department.findFirst({
                where: {
                    name: data.name,
                    NOT: { id },
                    deletedAt: null,
                },
            });
            if (existing) {
                throw new ConflictError('A department with this name already exists');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.department.update({
                where: { id },
                data,
            });

            await ActivityLogService.logFieldUpdate({
                userId,
                entityType: 'department',
                entityId: updated.id,
                subject: { label: 'Department', name: updated.name },
                changes: [
                    activityChange('Name', department.name, updated.name, undefined, {
                        section: 'Details',
                    }),
                    activityChange(
                        'Description',
                        department.description,
                        updated.description,
                        undefined,
                        {
                            section: 'Details',
                        }
                    ),
                ],
                tx,
            });

            return updated;
        });
    },

    delete: async (id: string, userId: string): Promise<void> => {
        const department = await prisma.department.findUnique({ where: { id } });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);

        const employees = await prisma.employee.findMany({
            where: { departmentId: id, deletedAt: null },
            select: { id: true },
        });

        if (employees.length > 0) {
            throw new BadRequestError(
                'Cannot delete department while employees are assigned to it. Remove employees from the department first.'
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.department.update({
                where: { id },
                data: { deletedAt: new Date() },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'department',
                entityId: id,
                action: 'delete',
                description: `Deleted department ${department.name}`,
                affectedEntityIds: employees.map((employee) => employee.id),
                tx,
            });
        });
    },

    assignEmployee: async (request: DepartmentAssignEmployeeRequest, userId: string) => {
        const { departmentId, employeeId } = request;

        const department = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        if (employee.departmentId === departmentId) {
            throw new ConflictError('Employee is already assigned to this department');
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.employee.update({
                where: { id: employeeId },
                data: { departmentId },
                include: { department: true, role: true },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'department',
                entityId: departmentId,
                action: 'link',
                description: `Assigned ${employee.name} to department ${department.name}`,
                affectedEntityIds: [employeeId, employee.departmentId].filter(
                    (id): id is string => !!id
                ),
                tx,
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: employeeId,
                action: 'link',
                description: `Assigned ${employee.name} to department ${department.name}`,
                affectedEntityIds: [departmentId, employee.departmentId].filter(
                    (id): id is string => !!id
                ),
                tx,
            });

            return updated;
        });
    },

    removeEmployee: async (
        request: DepartmentRemoveEmployeeRequest,
        userId: string
    ): Promise<void> => {
        const { departmentId, employeeId } = request;

        const [department, employee] = await prisma.$transaction([
            prisma.department.findUnique({ where: { id: departmentId } }),
            prisma.employee.findUnique({ where: { id: employeeId } }),
        ]);
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);
        if (!employee || employee.departmentId !== departmentId) {
            throw new NotFoundError('Employee is not assigned to this department');
        }
        checkDeletedAt(employee);

        await prisma.$transaction(async (tx) => {
            await tx.employee.update({
                where: { id: employeeId },
                data: { departmentId: null },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'department',
                entityId: departmentId,
                action: 'unlink',
                description: `Removed ${employee.name} from department ${department.name}`,
                affectedEntityIds: [employeeId],
                tx,
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: employeeId,
                action: 'unlink',
                description: `Removed ${employee.name} from department ${department.name}`,
                affectedEntityIds: [departmentId],
                tx,
            });
        });
    },
};
