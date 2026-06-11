import { useCallback } from 'react';

import type { ProjectTeamRole } from '@/modules/project/schemas/project-team.schema';

import {
  useAddTeamMemberMutation,
  usePromoteToLeadPMMutation,
  useRemoveTeamMemberMutation,
  useUpdateTeamMemberRoleMutation,
} from './project-team.hooks';

interface UseTeamMemberActionsOptions {
  projectId: string;
}

export function useTeamMemberActions({ projectId }: UseTeamMemberActionsOptions) {
  const addTeamMemberMutation = useAddTeamMemberMutation();
  const removeTeamMemberMutation = useRemoveTeamMemberMutation();
  const promotePMMutation = usePromoteToLeadPMMutation();
  const updateRoleMutation = useUpdateTeamMemberRoleMutation();

  const addMember = useCallback(
    async (employeeId: string) => {
      await addTeamMemberMutation.mutateAsync({
        projectId,
        employeeId,
        role: 'Member', // Default role required by backend
        isLead: false,
      });
    },
    [addTeamMemberMutation, projectId]
  );

  const removeMember = useCallback(
    async (employeeId: string) => {
      await removeTeamMemberMutation.mutateAsync({ projectId, employeeId });
    },
    [removeTeamMemberMutation, projectId]
  );

  const promoteToPM = useCallback(
    async (employeeId: string) => {
      await promotePMMutation.mutateAsync({
        projectId,
        employeeId,
      });
    },
    [promotePMMutation, projectId]
  );

  const updateRole = useCallback(
    async (employeeId: string, role: ProjectTeamRole) => {
      await updateRoleMutation.mutateAsync({
        projectId,
        employeeId,
        role,
      });
    },
    [projectId, updateRoleMutation]
  );

  return {
    addMember,
    removeMember,
    promoteToPM,
    updateRole,
    isAddingMember: addTeamMemberMutation.isPending,
    isRemovingMember: removeTeamMemberMutation.isPending,
    isPromoting: promotePMMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
  };
}
