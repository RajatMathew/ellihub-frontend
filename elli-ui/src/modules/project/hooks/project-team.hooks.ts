import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';
import { employeesKeys } from '@/modules/hr/constants/employees.keys';
import { projectTeamApi } from '@/modules/project/api/project-team.api';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type { ProjectTeamRole } from '@/modules/project/schemas/project-team.schema';

export const useAddTeamMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      employeeId: string;
      role: string;
      isLead?: boolean;
    }) => projectTeamApi.addMember(data),
    onSuccess: async (_, { projectId, employeeId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      await queryClient.invalidateQueries({ queryKey: employeesKeys.projects(employeeId) });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
      toast.success('Team member added.');
    },
    onError: (error) => toastApiError(error, 'Failed to add team member.'),
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
    onSuccess: async (_, { projectId, employeeId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      await queryClient.invalidateQueries({ queryKey: employeesKeys.projects(employeeId) });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to promote team member.'),
  });
};

export const useUpdateTeamMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      employeeId,
      role,
    }: {
      projectId: string;
      employeeId: string;
      role: ProjectTeamRole;
    }) => projectTeamApi.updateMemberRole(projectId, employeeId, role),
    onSuccess: async (_, { projectId, employeeId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      await queryClient.invalidateQueries({ queryKey: employeesKeys.projects(employeeId) });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
      toast.success('Team member role updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update team member role.'),
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
    onSuccess: async (_, { projectId, employeeId }) => {
      await invalidateProjectQueries(queryClient, [projectKeys.detail(projectId)]);
      await queryClient.invalidateQueries({ queryKey: employeesKeys.projects(employeeId) });
      void queryClient.invalidateQueries({ queryKey: employeesKeys.all });
      toast.success('Team member removed.');
    },
    onError: (error) => toastApiError(error, 'Failed to remove team member.'),
  });
};
