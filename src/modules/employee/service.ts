import { Employee } from '@db/client';
import { prisma } from '@lib/prisma';
import { FileService } from '@modules/file/services';
import { UserService } from '@modules/user/services';
import { ConflictError } from '@utils';
import { ulid } from 'ulid';

import { EmployeeCreateRequest } from './models';

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

            return employee;
        });
    },
};
