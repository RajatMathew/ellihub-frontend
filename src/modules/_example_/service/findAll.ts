import { Project } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';

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
