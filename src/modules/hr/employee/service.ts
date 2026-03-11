import { Employee } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { UserService } from '@modules/user/services';
import { generateRandomPassword } from '@modules/user/utils';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { EmployeeCreateRequest, EmployeeUpdateRequest } from './models';

const checkDeletedAt = (employee: { deletedAt: Date | null }) => {
    if (employee.deletedAt) throw new NotFoundError('Employee not found');
};

export const EmployeeService = {
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
                { email: { contains: search, mode: 'insensitive' as const } },
                { phoneNumber: { contains: search, mode: 'insensitive' as const } },
            ];
        }

        const [count, data] = await prisma.$transaction([
            prisma.employee.count({ where: whereClause }),
            prisma.employee.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as string]: sortOrder },
            }),
        ]);

        return { data, count };
    },

    get: async (id: string) => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);
        return employee;
    },

    create: async (request: EmployeeCreateRequest): Promise<Employee> => {
        const existing = await prisma.employee.findFirst({
            where: {
                email: request.email,
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('An employee with this email already exists');
        }

        const id = ulid();
        return await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.create({
                data: {
                    id,
                    email: request.email,
                    name: request.name,
                    phoneNumber: request.phoneNumber,
                    userId: id, // Keeping user id and employee id same for convenience.
                },
            });

            if (request.createAccount) {
                await UserService.createUser(
                    {
                        ...request,
                        password: generateRandomPassword(),
                        role: 'user',
                    },
                    tx,
                    employee.id,
                    request.roleId
                );
            }

            return employee;
        });
    },

    update: async (id: string, data: EmployeeUpdateRequest) => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        if (data.email) {
            const existing = await prisma.employee.findFirst({
                where: {
                    email: data.email,
                    NOT: { id },
                    deletedAt: null,
                },
            });

            if (existing) {
                throw new ConflictError('An employee with this email already exists');
            }
        }

        return await prisma.employee.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        const leadPMCount = await prisma.project.count({
            where: { leadPMId: id, deletedAt: null },
        });

        if (leadPMCount > 0) {
            throw new ConflictError(`Cannot delete employee: lead PM on ${leadPMCount} project(s)`);
        }

        const teamCount = await prisma.projectTeamAssignment.count({
            where: { employeeId: id, deletedAt: null },
        });

        if (teamCount > 0) {
            throw new ConflictError(`Cannot delete employee: assigned to ${teamCount} project(s)`);
        }

        await prisma.employee.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    getProjects: async (employeeId: string) => {
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        const [leadingProjects, teamAssignments] = await Promise.all([
            prisma.project.findMany({
                where: { leadPMId: employeeId, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    jobNumber: true,
                    status: { select: { id: true, name: true, label: true, color: true } },
                },
            }),
            prisma.projectTeamAssignment.findMany({
                where: { employeeId, deletedAt: null },
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            jobNumber: true,
                            status: { select: { id: true, name: true, label: true, color: true } },
                        },
                    },
                },
            }),
        ]);

        return {
            asLeadPM: leadingProjects,
            asTeamMember: teamAssignments.map((a) => ({
                ...a.project,
                role: a.role,
            })),
        };
    },
};
