import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectScheduleApi } from '@modules/project/api/project-schedule.api';
import { projectScheduleKeys } from '@modules/project/constants/project-schedule.keys';
import { projectKeys } from '@modules/project/constants/project.keys';
import type {
  CreateScheduleEntryInput,
  ListScheduleParams,
  UpdateScheduleEntryInput,
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
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateScheduleEntryInput;
    }) => projectScheduleApi.create(projectId, data),
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
    mutationFn: ({
      projectId,
      entryId,
      data,
    }: {
      projectId: string;
      entryId: string;
      data: UpdateScheduleEntryInput;
    }) => projectScheduleApi.update(projectId, entryId, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectScheduleKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to update schedule entry.'),
  });
};

export const useDeleteScheduleEntryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      entryId,
    }: {
      projectId: string;
      entryId: string;
    }) => projectScheduleApi.remove(projectId, entryId),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectScheduleKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to delete schedule entry.'),
  });
};
