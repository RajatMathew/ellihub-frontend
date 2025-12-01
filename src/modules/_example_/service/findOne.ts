import { Project } from '@db/client';
import { prisma } from '@lib/prisma';
import { NotFoundError } from '@utils';

export const findOneProject = async ({ id }: { id: string }): Promise<Project> => {
  const project = await prisma.project.findUnique({
    where: { id },
  });
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  return project;
};
