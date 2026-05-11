import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectScheduleApi } from '@/modules/project/api/project-schedule.api';
import { projectScheduleKeys } from '@/modules/project/constants/project-schedule.keys';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreateScheduleEntryInput,
  UpdateScheduleEntryInput,
} from '@/modules/project/schemas/project-schedule.schema';

type UpdateScheduleEntryMutationInput = UpdateScheduleEntryInput & {
  projectId: string;
};

export const useProjectScheduleQuery = (projectId: string) =>
  useQuery({
    queryKey: projectScheduleKeys.list(projectId),
    queryFn: () => projectScheduleApi.list(projectId),
    enabled: !!projectId,
  });

export const useCreateScheduleEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleEntryInput) => projectScheduleApi.create(data),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [
        projectScheduleKeys.list(projectId),
        projectKeys.detail(projectId),
      ]);
    },
    onError: () => toast.error('Failed to create schedule entry.'),
  });
};

export const useUpdateScheduleEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateScheduleEntryMutationInput) =>
      projectScheduleApi.update({
        id: data.id,
        date: data.date,
        description: data.description,
        adjustedFinishDate: data.adjustedFinishDate,
        notes: data.notes,
        fileId: data.fileId,
      }),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [
        projectScheduleKeys.list(projectId),
        projectKeys.detail(projectId),
      ]);
    },
    onError: () => toast.error('Failed to update schedule entry.'),
  });
};

export const useDeleteScheduleEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { projectId: string; id: string }) => projectScheduleApi.remove(id),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [
        projectScheduleKeys.list(projectId),
        projectKeys.detail(projectId),
      ]);
    },
    onError: () => toast.error('Failed to delete schedule entry.'),
  });
};
