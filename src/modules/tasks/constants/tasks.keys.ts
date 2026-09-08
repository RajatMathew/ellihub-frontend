import type { ListTasksParams, TaskFilters } from '@/modules/tasks/schemas/task.schema';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: ListTasksParams) => [...taskKeys.lists(), params] as const,
  // The board's own list: every task rather than a page, so it needs a key of
  // its own. Still under lists(), so the optimistic writes reach it.
  board: (filters: TaskFilters) => [...taskKeys.lists(), 'board', filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
