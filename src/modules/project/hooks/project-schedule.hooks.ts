import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectScheduleApi } from '@modules/project/api/project-schedule.api';
import { projectScheduleKeys } from '@modules/project/constants/project-schedule.keys';
import { projectKeys } from '@modules/project/constants/project.keys';
import type {
  ListScheduleParams,
} from '@modules/project/schemas/project-schedule.schema';

export const useProjectScheduleQuery = (projectId: string, params?: ListScheduleParams) =>
  useQuery({
    queryKey: [...projectScheduleKeys.list(projectId), params],
    queryFn: () => projectScheduleApi.list(projectId, params),
    enabled: !!projectId,
  });

export const useCreateScheduleEntryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      date: string;
      description: string;
      adjustedStartDate?: string;
      adjustedFinishDate?: string;
      notes?: string;
      fileId?: string;
    }) => projectScheduleApi.create(data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectScheduleKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to create schedule entry.'),
  });
};

export const useUpdateScheduleEntryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      date?: string;
      description?: string;
      adjustedStartDate?: string;
      adjustedFinishDate?: string;
      notes?: string;
      fileId?: string;
      projectId?: string; // and this if needed for invalidation
    }) => projectScheduleApi.update(data),
    onSuccess: (_, variables) => {
      if (variables.projectId) {
        qc.invalidateQueries({ queryKey: projectScheduleKeys.list(variables.projectId) });
        qc.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      }
    },
    onError: () => toast.error('Failed to update schedule entry.'),
  });
};

export const useDeleteScheduleEntryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      projectScheduleApi.remove(projectId, id),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectScheduleKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to delete schedule entry.'),
  });
};
