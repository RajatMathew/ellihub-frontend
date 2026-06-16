import { useQuery } from '@tanstack/react-query';

import { projectStageApi } from '@/modules/project/api/project-stage.api';
import { projectStageKeys } from '@/modules/project/constants/project-stage.keys';

export const useProjectStagesQuery = () =>
  useQuery({
    queryKey: projectStageKeys.list(),
    queryFn: () => projectStageApi.list(),
  });
