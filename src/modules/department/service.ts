import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

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

    create: async (request: DepartmentCreateRequest) => {
        const existing = await prisma.department.findFirst({
            where: { name: request.name, deletedAt: null },
        });
        if (existing) {
            throw new ConflictError('A department with this name already exists');
        }

        return await prisma.department.create({
            data: {
                id: ulid(),
                name: request.name,
                description: request.description,
            },
        });
    },

    update: async (request: DepartmentUpdateRequest) => {
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

        return await prisma.department.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const department = await prisma.department.findUnique({ where: { id } });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);

        await prisma.department.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    assignEmployee: async (request: DepartmentAssignEmployeeRequest) => {
        const { departmentId, employeeId, roleId } = request;

        const department = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) throw new NotFoundError('Department not found');
        checkDeletedAt(department);

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        const role = await prisma.lookup.findUnique({ where: { id: roleId } });
        if (!role) throw new NotFoundError('Role not found');

        if (employee.departmentId === departmentId && employee.roleId === roleId) {
            throw new ConflictError(
                'Employee is already assigned to this department with this role'
            );
        }

        return await prisma.employee.update({
            where: { id: employeeId },
            data: { departmentId, roleId },
            include: { department: true, role: true },
        });
    },

    removeEmployee: async (request: DepartmentRemoveEmployeeRequest): Promise<void> => {
        const { departmentId, employeeId } = request;

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee || employee.departmentId !== departmentId) {
            throw new NotFoundError('Employee is not assigned to this department');
        }

        await prisma.employee.update({
            where: { id: employeeId },
            data: { departmentId: null, roleId: null },
        });
    },
};
