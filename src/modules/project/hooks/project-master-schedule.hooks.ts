import { toastApiError } from '@/app/lib/toast-api-error';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { projectMasterScheduleApi } from '@/modules/project/api/project-master-schedule.api';
import { projectMasterScheduleKeys } from '@/modules/project/constants/project-master-schedule.keys';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  ProjectMasterSchedule,
  SetProjectMasterScheduleInput,
} from '@/modules/project/schemas/project-master-schedule.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useProjectMasterScheduleQuery = (projectId: string) =>
  useQuery({
    queryKey: projectMasterScheduleKeys.detail(projectId),
    queryFn: () => projectMasterScheduleApi.get(projectId),
    enabled: !!projectId,
  });

function writeMasterScheduleCaches(
  queryClient: QueryClient,
  projectId: string,
  masterSchedule: ProjectMasterSchedule | null
) {
  queryClient.setQueryData(projectMasterScheduleKeys.detail(projectId), masterSchedule);
  queryClient.setQueryData<ProjectDetail | undefined>(projectKeys.detail(projectId), (project) =>
    project ? { ...project, masterSchedule } : project
  );
}

export const useSetProjectMasterScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: SetProjectMasterScheduleInput }) =>
      projectMasterScheduleApi.set(projectId, data),
    onSuccess: async (masterSchedule, { projectId }) => {
      writeMasterScheduleCaches(queryClient, projectId, masterSchedule);
      await invalidateProjectQueries(queryClient, [
        projectMasterScheduleKeys.detail(projectId),
        projectKeys.detail(projectId),
        filesKeys.all,
      ]);
      toast.success('Master schedule updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update master schedule.'),
  });
};

export const useRemoveProjectMasterScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      projectMasterScheduleApi.remove(projectId),
    onSuccess: async (_, { projectId }) => {
      writeMasterScheduleCaches(queryClient, projectId, null);
      await invalidateProjectQueries(queryClient, [
        projectMasterScheduleKeys.detail(projectId),
        projectKeys.detail(projectId),
        filesKeys.all,
      ]);
      toast.success('Master schedule removed from project.');
    },
    onError: (error) => toastApiError(error, 'Failed to remove master schedule.'),
  });
};
