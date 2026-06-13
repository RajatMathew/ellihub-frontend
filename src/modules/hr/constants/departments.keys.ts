import type { ListDepartmentsParams } from '@/modules/hr/schemas/department.schema';

export const departmentsKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentsKeys.all, 'list'] as const,
  list: (params?: ListDepartmentsParams) => [...departmentsKeys.lists(), params] as const,
  stats: () => [...departmentsKeys.all, 'stats'] as const,
  details: () => [...departmentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentsKeys.details(), id] as const,
};
