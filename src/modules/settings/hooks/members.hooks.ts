import { membersApi } from '@/modules/settings/api/members.api';
import { membersKeys } from '@/modules/settings/constants/members.keys';
import type {
  MemberCreateInput,
  MemberRole,
  MemberUpdateInput,
  MembersListParams,
} from '@/modules/settings/schemas/members.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useMembersQuery = (params: MembersListParams, enabled = true) => {
  return useQuery({
    queryKey: membersKeys.list(params),
    queryFn: () => membersApi.list(params),
    enabled,
  });
};

export const useCreateMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MemberCreateInput) => membersApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Member created.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create member.')),
  });
};

export const useUpdateMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MemberUpdateInput) => membersApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Member updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update member.')),
  });
};

export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      membersApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Role updated.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update role.')),
  });
};

export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => membersApi.remove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Member removed.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to remove member.')),
  });
};

