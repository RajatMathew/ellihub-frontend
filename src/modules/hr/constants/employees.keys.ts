import type { ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';

export const employeesKeys = {
  all: ['employees'] as const,
  lists: () => [...employeesKeys.all, 'list'] as const,
  list: (params: ListEmployeesParams) => [...employeesKeys.lists(), { params }] as const,
  stats: () => [...employeesKeys.all, 'stats'] as const,
  details: () => [...employeesKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
  projects: (id: string) => [...employeesKeys.detail(id), 'projects'] as const,
};
