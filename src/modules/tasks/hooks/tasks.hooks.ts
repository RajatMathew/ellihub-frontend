import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import { shiftTaskDueDateInList } from '@/modules/tasks/lib/task-cache';
import type {
  CreateTaskInput,
  ListTasksParams,
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

export const useSetTaskCompletedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      tasksApi.setCompleted(id, completed),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success(task.status === 'COMPLETED' ? 'Task completed' : 'Task reopened');
    },
    onError: (error) => toastApiError(error, 'Failed to update task'),
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
    // Whether it worked or not, the server has the last word on the date.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Task deleted');
    },
    onError: (error) => toastApiError(error, 'Failed to delete task'),
  });
};
