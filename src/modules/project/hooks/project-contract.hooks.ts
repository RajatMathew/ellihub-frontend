import { useQuery } from '@tanstack/react-query';

import { projectContractApi } from '@/modules/project/api/project-contract.api';
import { projectContractKeys } from '@/modules/project/constants/project-contract.keys';

export const useProjectContractQuery = (projectId: string) =>
  useQuery({
    queryKey: projectContractKeys.detail(projectId),
    queryFn: () => projectContractApi.get(projectId),
    enabled: !!projectId,
  });
