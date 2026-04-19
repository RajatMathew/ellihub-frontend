import { Employee } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { UserService } from '@modules/user/services';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { EmployeeCreateRequest, EmployeeUpdateRequest } from './models';

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

        const id = ulid();

        return await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.create({
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
                    userId: id,
                },
            });

            if (request.createAccount) {
                await UserService.createUser(
                    {
                        email: request.email,
                        name: request.name,
                        password: 'employeepassword',
                        role: 'user',
                    },
                    headers,
                    tx,
                    employee.id,
                    request.roleId
                );
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
    },

    update: async (request: EmployeeUpdateRequest, userId: string): Promise<Employee> => {
        const existing = await prisma.employee.findUnique({ where: { id: request.id } });
        if (!existing || existing.deletedAt) {
            throw new NotFoundError('Employee not found');
        }

        const nameChanged = request.name !== existing.name;
        const emailChanged = request.email !== existing.email;

        if (emailChanged) {
            const dupEmployee = await prisma.employee.findFirst({
                where: { email: request.email, deletedAt: null, NOT: { id: request.id } },
            });
            if (dupEmployee) {
                throw new ConflictError('An employee with this email already exists');
            }

            const dupUser = await prisma.user.findFirst({
                where: {
                    email: request.email,
                    NOT: { id: existing.userId ?? '' },
                },
            });
            if (dupUser) {
                throw new ConflictError('A user with this email already exists');
            }
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
                },
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
};
