import { Employee } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { FileService } from '@modules/file/services';
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

    create: async (request: EmployeeCreateRequest, userId: string): Promise<Employee> => {
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

            await FileService.createEmployeeFolder(tx, employee.id, request.name, userId);

            return employee;
        });
    },

    update: async (request: EmployeeUpdateRequest) => {
        const { id, ...data } = request;

        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        if (data.email && data.email !== employee.email) {
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

        const nameChanged = data.name && data.name !== employee.name;
        const emailChanged = data.email && data.email !== employee.email;

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.employee.update({
                where: { id },
                data,
            });

            if (nameChanged) {
                const folderId = await FileService.getEmployeeFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, data.name, tx);
            }

            if (employee.userId && (nameChanged || emailChanged)) {
                await tx.user.update({
                    where: { id: employee.userId },
                    data: {
                        ...(nameChanged && { name: data.name }),
                        ...(emailChanged && { email: data.email }),
                    },
                });
            }

            return updated;
        });
    },

    delete: async (id: string): Promise<void> => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        await prisma.employee.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
