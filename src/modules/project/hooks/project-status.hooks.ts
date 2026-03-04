import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectStatusApi } from '@modules/project/api/project-status.api';
import { projectStatusKeys } from '@modules/project/constants/project-status.keys';
import type {
  CreateProjectStatusInput,
  UpdateProjectStatusInput,
} from '@modules/project/schemas/project-status.schema';

export const useProjectStatusesQuery = () =>
  useQuery({
    queryKey: projectStatusKeys.list(),
    queryFn: () => projectStatusApi.list(),
  });

export const useCreateProjectStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectStatusInput) => projectStatusApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStatusKeys.all });
    },
    onError: () => toast.error('Failed to create project status.'),
  });
};

export const useUpdateProjectStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectStatusInput }) =>
      projectStatusApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStatusKeys.all });
    },
    onError: () => toast.error('Failed to update project status.'),
  });
};

export const useDeleteProjectStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectStatusApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStatusKeys.all });
    },
    onError: () => toast.error('Failed to delete project status.'),
  });
};
