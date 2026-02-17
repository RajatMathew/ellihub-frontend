import { Employee } from '@db/client';
import { prisma } from '@lib/prisma';
import { UserService } from '@modules/user/services';
import { generateRandomPassword } from '@modules/user/utils';
import { ulid } from 'ulid';

import { EmployeeCreateRequest } from './models';

export const EmployeeService = {
    create: async (request: EmployeeCreateRequest): Promise<Employee> => {
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
                const user = await UserService.createUser(
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
};
