import type { ListPTOParams } from '@/modules/hr/schemas/pto.schema';

export const ptoKeys = {
  all: ['pto'] as const,
  lists: () => [...ptoKeys.all, 'list'] as const,
  list: (params: ListPTOParams) => [...ptoKeys.lists(), params] as const,
  stats: () => [...ptoKeys.all, 'stats'] as const,
  details: () => [...ptoKeys.all, 'detail'] as const,
  detail: (id: string) => [...ptoKeys.details(), id] as const,
};
