import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { ProjectStatusCreateRequest, ProjectStatusUpdateRequest } from './project-status.models';

export const ProjectStatusService = {
    list: async () => {
        return await prisma.projectStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.projectStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Project status not found');
        return status;
    },

    create: async (data: ProjectStatusCreateRequest) => {
        const existing = await prisma.projectStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('A project status with this name or order already exists');
        }

        return await prisma.projectStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: ProjectStatusUpdateRequest) => {
        const status = await prisma.projectStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Project status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.projectStatus.findFirst({
                where: {
                    OR: [
                        ...(data.name ? [{ name: data.name }] : []),
                        ...(data.order !== undefined ? [{ order: data.order }] : []),
                    ],
                    NOT: { id },
                    deletedAt: null,
                },
            });

            if (existing) {
                throw new ConflictError('A project status with this name or order already exists');
            }
        }

        return await prisma.projectStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.projectStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Project status not found');

        if (status.isDefault) {
            throw new ConflictError('Cannot delete the default project status');
        }

        const projectCount = await prisma.project.count({
            where: { statusId: id },
        });

        if (projectCount > 0) {
            throw new ConflictError(
                `Cannot delete status: ${projectCount} project(s) still reference it`
            );
        }

        await prisma.projectStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
