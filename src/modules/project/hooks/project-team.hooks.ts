import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectTeamApi } from '@modules/project/api/project-team.api';
import { projectTeamKeys } from '@modules/project/constants/project-team.keys';
import { projectKeys } from '@modules/project/constants/project.keys';

export const useProjectTeamQuery = (projectId: string) =>
  useQuery({
    queryKey: projectTeamKeys.detail(projectId),
    queryFn: () => projectTeamApi.list(projectId),
    enabled: !!projectId,
  });

export const useAddTeamMemberMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      employeeId: string;
      role: string;
      isLead?: boolean;
    }) => projectTeamApi.addMember(data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectTeamKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to add team member.'),
  });
};

export const usePromoteToLeadPMMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      employeeId,
      keepOldPM,
    }: {
      projectId: string;
      employeeId: string;
      keepOldPM?: boolean;
    }) => projectTeamApi.promoteToLeadPM(projectId, employeeId, keepOldPM),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectTeamKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to promote team member.'),
  });
};

export const useRemoveTeamMemberMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      employeeId,
    }: {
      projectId: string;
      employeeId: string;
    }) => projectTeamApi.removeMember(projectId, employeeId),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: projectTeamKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to remove team member.'),
  });
};
