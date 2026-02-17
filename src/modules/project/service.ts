import { Project } from '@db/client';
import { prisma } from '@lib/prisma';
import { ulid } from 'ulid';

import { ProjectCreateRequest } from './models';

export const ProjectService = {
    createProject: async (request: ProjectCreateRequest, userId: string): Promise<Project> => {
        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    id: ulid(),
                    ...request,
                },
            });

            await tx.projectTeamAssignment.create({
                data: {
                    role: 'Lead',
                    employeeId: userId,
                    projectId: project.id,
                },
            });

            return project;
        });
    },
};
