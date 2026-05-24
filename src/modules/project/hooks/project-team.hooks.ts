import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectTeamApi } from '@/modules/project/api/project-team.api';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';

export const useAddTeamMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      employeeId: string;
      role: string;
      isLead?: boolean;
    }) => projectTeamApi.addMember(data),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      toast.success('Team member added.');
    },
    onError: () => toast.error('Failed to add team member.'),
  });
};

export const usePromoteToLeadPMMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      employeeId,
    }: {
      projectId: string;
      employeeId: string;
    }) => projectTeamApi.promoteToLeadPM(projectId, employeeId),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
    },
    onError: () => toast.error('Failed to promote team member.'),
  });
};

export const useRemoveTeamMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      employeeId,
    }: {
      projectId: string;
      employeeId: string;
    }) => projectTeamApi.removeMember(projectId, employeeId),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      toast.success('Team member removed.');
    },
    onError: () => toast.error('Failed to remove team member.'),
  });
};
