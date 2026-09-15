import type { ListTasksParams, TaskBoardParams } from '@/modules/tasks/schemas/task.schema';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: ListTasksParams) => [...taskKeys.lists(), params] as const,
  // The board is its own shape - columns, not a page - so it lives under its
  // own prefix, and the optimistic writes address that prefix and nothing
  // else. The server's day and the filter are in the key: a different day or
  // a different person is a different board.
  boards: () => [...taskKeys.all, 'board'] as const,
  board: (params: TaskBoardParams) => [...taskKeys.boards(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
