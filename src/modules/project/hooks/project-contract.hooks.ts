import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectContractApi } from '@modules/project/api/project-contract.api';
import { projectContractKeys } from '@modules/project/constants/project-contract.keys';
import { projectKeys } from '@modules/project/constants/project.keys';
import type { UpsertPrimeContractInput } from '@modules/project/schemas/project-contract.schema';

export const useProjectContractQuery = (projectId: string) =>
  useQuery({
    queryKey: projectContractKeys.detail(projectId),
    queryFn: () => projectContractApi.get(projectId),
    enabled: !!projectId,
  });

export const useUpsertProjectContractMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: UpsertPrimeContractInput;
    }) => projectContractApi.upsert(projectId, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectContractKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to save contract.'),
  });
};
