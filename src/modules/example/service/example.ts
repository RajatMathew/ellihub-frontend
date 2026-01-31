import { Project } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { NotFoundError } from '@utils';

export const findAllProjects = async ({
    pagination,
}: {
    pagination: PaginationParams;
}): Promise<{ data: Project[]; count: number }> => {
    const { skip, take } = pagination;
    const [projects, count] = await Promise.all([
        prisma.project.findMany({
            skip,
            take,
        }),
        prisma.project.count(),
    ]);
    return { data: projects, count };
};

export const findOneProject = async ({ id }: { id: string }): Promise<Project> => {
    const project = await prisma.project.findUnique({
        where: { id },
    });
    if (!project) {
        throw new NotFoundError('Project not found');
    }
    return project;
};

export const createProject = async (): Promise<Project> => {
    const data = {
        name: 'New Project',
        description: 'This is a new project',
    };
    const project = await prisma.project.create({
        data: data as any,
    });
    return project;
};

export const updateProject = async (
    id: string,
    data: {
        name?: string;
        description?: string;
    }
): Promise<Project> => {
    const project = await prisma.project.update({
        where: { id },
        data,
    });
    return project;
};
