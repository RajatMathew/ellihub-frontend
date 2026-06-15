import { toastApiError } from '@/app/lib/toast-api-error';
import { membersApi } from '@/modules/settings/api/members.api';
import { membersKeys } from '@/modules/settings/constants/members.keys';
import type {
  MemberCreateInput,
  MemberPasswordResetInput,
  MemberRole,
  MemberSuspendInput,
  MemberUpdateInput,
  MembersListParams,
} from '@/modules/settings/schemas/members.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    onError: (error) => toastApiError(error, 'Failed to create member.'),
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
    onError: (error) => toastApiError(error, 'Failed to update member.'),
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
    onError: (error) => toastApiError(error, 'Failed to update role.'),
  });
};

export const useResetMemberPasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MemberPasswordResetInput) => membersApi.resetPassword(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Password reset.');
    },
    onError: (error) => toastApiError(error, 'Failed to reset password.'),
  });
};

export const useSuspendMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MemberSuspendInput) => membersApi.suspend(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Member suspended.');
    },
    onError: (error) => toastApiError(error, 'Failed to suspend member.'),
  });
};

export const useUnsuspendMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => membersApi.unsuspend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      toast.success('Member unsuspended.');
    },
    onError: (error) => toastApiError(error, 'Failed to unsuspend member.'),
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
    onError: (error) => toastApiError(error, 'Failed to remove member.'),
  });
};

