import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { toastUndoable } from '@/modules/tasks/components/toast-undoable';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import {
  placeTaskInList,
  removeTaskFromList,
  setTaskCompletedInList,
  shiftTaskDueDateInList,
} from '@/modules/tasks/lib/task-cache';
import { placeTask, type PlacementRequest } from '@/modules/tasks/lib/task-placement';
import type {
  CreateTaskInput,
  ListTasksParams,
  TaskFilters,
  TaskPaginatedResponse,
  UpdateTaskInput,
} from '@/modules/tasks/schemas/task.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useTasksQuery = (params: ListTasksParams) =>
  useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.list(params),
  });

/**
 * Every task at once, for the board.
 *
 * The board is not a paginated list: it groups tasks into columns by due date
 * and orders them within a column itself, so a page of them is not a smaller
 * board, it is a wrong one. Keyed under taskKeys.lists() like the paged query,
 * so the optimistic writes in this file reach it unchanged.
 */
export const useAllTasksQuery = (filters: TaskFilters = {}) =>
  useQuery({
    queryKey: taskKeys.board(filters),
    queryFn: () => tasksApi.listAll(filters),
  });

export const useTaskDetailQuery = (id: string) =>
  useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  });

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Task created');
    },
    onError: (error) => toastApiError(error, 'Failed to create task'),
  });
};

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskInput) => tasksApi.update(data),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      toast.success('Task updated');
    },
    onError: (error) => toastApiError(error, 'Failed to update task'),
  });
};

// Backs the card's completion circle.
//
// The new status is written into the cache before the request goes out, for the
// reason the shift below spells out: COMPLETED is a column, so the status is
// what moves the card, and it has to move while the tick is still under the
// cursor. Waiting for the round trip left a second of nothing and then a jump,
// which is what made ticking a card look unlike dragging one. A failure puts
// the old status back. See elli-ui#862.
export const useSetTaskCompletedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      tasksApi.setCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      // In-flight reads would otherwise land after this and put the card back.
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previous = queryClient.getQueriesData<TaskPaginatedResponse>({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData<TaskPaginatedResponse>({ queryKey: taskKeys.lists() }, (page) =>
        page ? setTaskCompletedInList(page, id, completed) : page
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      for (const [key, page] of context?.previous ?? []) queryClient.setQueryData(key, page);
      toastApiError(error, 'Failed to update task');
    },
    onSuccess: (task) => {
      toast.success(task.status === 'COMPLETED' ? 'Task completed' : 'Task reopened');
    },
    // Whether it worked or not, the server has the last word on the status.
    // The lists and this task's detail — not `all`, which would also throw
    // away every other open task's detail and refetch the whole board's page
    // walk on every tick.
    onSettled: (_task, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
};

// Backs the card's "+1 day" control. Days is signed, so the same hook can pull
// a due date earlier.
//
// The new date is written into the cache before the request goes out. The board
// groups by due date, so that is what moves the card — and it has to happen on
// the click: waiting for the round trip made +1 day look like it had done
// nothing at all. A failure puts the old dates back.
export const useShiftTaskDueDateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => tasksApi.shiftDueDate(id, days),
    onMutate: async ({ id, days }) => {
      // In-flight reads would otherwise land after this and undo it.
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previous = queryClient.getQueriesData<TaskPaginatedResponse>({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData<TaskPaginatedResponse>({ queryKey: taskKeys.lists() }, (page) =>
        page ? shiftTaskDueDateInList(page, id, days) : page
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      for (const [key, page] of context?.previous ?? []) queryClient.setQueryData(key, page);
      toastApiError(error, 'Failed to move the due date');
    },
    // Whether it worked or not, the server has the last word on the date. The
    // lists and this task's detail, not `all` — see useSetTaskCompletedMutation.
    onSettled: (_task, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
};

// Dragging a card, within its column or into another one (elli-ui#791).
//
// Written to the cache on release rather than on the response: the board does
// not reorder while you drag — it draws an indicator instead — so without this
// the card would sit where it started until the round trip finished, and the
// drop would look like it had been refused. `boardOrder` is the value the
// server will settle on, so its answer replaces this with itself.
export const useReorderTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // A card dragged out of Completed is reopened first, then placed — see
    // placeTask for why the order matters and what a failure part-way undoes.
    mutationFn: ({
      boardOrder: _boardOrder,
      ...request
    }: PlacementRequest & { boardOrder: number | null }) => placeTask(tasksApi, request),
    onMutate: async ({ id, boardOrder, dueAt, reopen }) => {
      // In-flight reads would otherwise land after this and undo it.
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previous = queryClient.getQueriesData<TaskPaginatedResponse>({
        queryKey: taskKeys.lists(),
      });

      // Both steps at once, so the card goes straight to the drop rather than
      // showing up reopened on its old date for the length of a round trip.
      queryClient.setQueriesData<TaskPaginatedResponse>({ queryKey: taskKeys.lists() }, (page) => {
        if (!page) return page;
        const reopened = reopen ? setTaskCompletedInList(page, id, false) : page;
        return placeTaskInList(reopened, id, boardOrder, dueAt);
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      for (const [key, page] of context?.previous ?? []) queryClient.setQueryData(key, page);
      toastApiError(error, 'Failed to move the task');
    },
    onSuccess: (_task, { reopen }) => {
      if (reopen) toast.success('Task reopened');
    },
    // Whether it worked or not, the server has the last word on the position.
    // The lists and this task's detail, not `all` — see useSetTaskCompletedMutation.
    onSettled: (_task, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
};

// Undo, for the toast the delete raises. The server keeps the row, so this only
// has to clear the flag — there is nothing to rebuild.
export const useRestoreTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    // No toast on the way in — the undo toast is still on screen and reports the
    // outcome itself. A failure still needs one, since that is the one case the
    // toast's own success line would be lying about.
    onError: (error) => toastApiError(error, 'Failed to restore the task'),
  });
};

/**
 * Delete a task, with a way back.
 *
 * The delete is soft server-side: `deletedAt` is stamped and the row keeps its
 * links and the email it came from. So the card leaving the board is the only
 * thing that actually happens on the click, and it happens optimistically —
 * an Undo offered next to a card still sitting there reads as a question rather
 * than a reversal.
 *
 * There is no trash view by design (elli-ui#800): this toast is the only way
 * back, which is why it carries the id rather than relying on anything to list
 * deleted tasks later.
 */
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const restoreTask = useRestoreTaskMutation();

  return useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => tasksApi.delete(id),
    onMutate: async ({ id }) => {
      // In-flight reads would otherwise land after this and put the card back.
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previous = queryClient.getQueriesData<TaskPaginatedResponse>({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData<TaskPaginatedResponse>({ queryKey: taskKeys.lists() }, (page) =>
        page ? removeTaskFromList(page, id) : page
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      for (const [key, page] of context?.previous ?? []) queryClient.setQueryData(key, page);
      toastApiError(error, 'Failed to delete task');
    },
    onSuccess: (_data, { id, title }) => {
      toastUndoable({
        icon: 'trash',
        title: 'Task deleted',
        description: title,
        onUndo: () => restoreTask.mutate(id),
      });
    },
    // Only once the delete has settled: invalidating in onMutate would refetch
    // the task straight back onto the board.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};
