import { Employee, EmployeeDocument } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { UserService } from '@modules/user/services';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddEmployeeDocumentRequest,
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    RemoveEmployeeDocumentRequest,
} from './models';

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
                include: { department: true, role: true },
            }),
        ]);

        return { data, count };
    },

    get: async (id: string): Promise<Employee> => {
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: { department: true, role: true },
        });
        if (!employee || employee.deletedAt) {
            throw new NotFoundError('Employee not found');
        }
        return employee;
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

    delete: async (id: string, userId: string): Promise<void> => {
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        const [leadProjects, teamMemberships] = await Promise.all([
            prisma.project.findMany({
                where: { leadPMId: id, deletedAt: null },
                select: { id: true },
            }),
            prisma.projectTeamMember.findMany({
                where: { employeeId: id },
                select: { projectId: true },
            }),
        ]);
        const affectedProjectIds = Array.from(
            new Set([
                ...leadProjects.map((project) => project.id),
                ...teamMemberships.map((member) => member.projectId),
            ])
        );

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
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'employee',
                entityId: id,
                action: 'delete',
                description: `Deleted employee ${employee.name}`,
                affectedEntityIds: affectedProjectIds,
                tx,
            });
        });
    },

    addDocument: async (
        request: AddEmployeeDocumentRequest,
        userId: string
    ): Promise<EmployeeDocument> => {
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
                    id: ulid(),
                    employeeId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
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
            description: `Unlinked document (fileId=${fileId}) from employee`,
            affectedEntityIds: [fileId],
        });
    },
};
