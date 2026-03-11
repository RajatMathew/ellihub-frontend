import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { ProjectStageCreateRequest, ProjectStageUpdateRequest } from './project-stage.models';

export const ProjectStageService = {
    list: async () => {
        return await prisma.projectStage.findMany({
            orderBy: { name: 'asc' },
        });
    },

    get: async (id: string) => {
        const stage = await prisma.projectStage.findUnique({ where: { id } });
        if (!stage) throw new NotFoundError('Project stage not found');
        return stage;
    },

    create: async (data: ProjectStageCreateRequest) => {
        const existing = await prisma.projectStage.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code }],
            },
        });

        if (existing) {
            throw new ConflictError('A project stage with this name or code already exists');
        }

        return await prisma.projectStage.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: ProjectStageUpdateRequest) => {
        const stage = await prisma.projectStage.findUnique({ where: { id } });
        if (!stage) throw new NotFoundError('Project stage not found');

        if (data.name || data.code) {
            const existing = await prisma.projectStage.findFirst({
                where: {
                    OR: [
                        ...(data.name ? [{ name: data.name }] : []),
                        ...(data.code ? [{ code: data.code }] : []),
                    ],
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictError('A project stage with this name or code already exists');
            }
        }

        return await prisma.projectStage.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const stage = await prisma.projectStage.findUnique({ where: { id } });
        if (!stage) throw new NotFoundError('Project stage not found');

        const projectCount = await prisma.project.count({
            where: { stageId: id },
        });

        if (projectCount > 0) {
            throw new ConflictError(
                `Cannot delete stage: ${projectCount} project(s) still reference it`
            );
        }

        await prisma.projectStage.delete({ where: { id } });
    },
};
