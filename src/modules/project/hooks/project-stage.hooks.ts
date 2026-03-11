import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectStageApi } from '@modules/project/api/project-stage.api';
import { projectStageKeys } from '@modules/project/constants/project-stage.keys';
import type {
  CreateProjectStageInput,
  UpdateProjectStageInput,
} from '@modules/project/schemas/project-stage.schema';

export const useProjectStagesQuery = () =>
  useQuery({
    queryKey: projectStageKeys.list(),
    queryFn: () => projectStageApi.list(),
  });

export const useCreateProjectStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectStageInput) => projectStageApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStageKeys.all });
    },
    onError: () => toast.error('Failed to create project stage.'),
  });
};

export const useUpdateProjectStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectStageInput }) =>
      projectStageApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStageKeys.all });
    },
    onError: () => toast.error('Failed to update project stage.'),
  });
};

export const useDeleteProjectStageMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectStageApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectStageKeys.all });
    },
    onError: () => toast.error('Failed to delete project stage.'),
  });
};
