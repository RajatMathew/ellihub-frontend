import { useCallback } from 'react';

import {
  useAddTeamMemberMutation,
  usePromoteToLeadPMMutation,
  useRemoveTeamMemberMutation,
} from './project-team.hooks';

interface UseTeamMemberActionsOptions {
  projectId: string;
}

export function useTeamMemberActions({ projectId }: UseTeamMemberActionsOptions) {
  const addTeamMemberMutation = useAddTeamMemberMutation();
  const removeTeamMemberMutation = useRemoveTeamMemberMutation();
  const promotePMMutation = usePromoteToLeadPMMutation();

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

  return {
    addMember,
    removeMember,
    promoteToPM,
    isAddingMember: addTeamMemberMutation.isPending,
    isRemovingMember: removeTeamMemberMutation.isPending,
    isPromoting: promotePMMutation.isPending,
  };
}
