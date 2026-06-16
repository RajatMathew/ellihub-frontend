import { toastApiError } from '@/app/lib/toast-api-error';
import { profileApi } from '@/modules/profile/api/profile.api';
import { profileKeys } from '@/modules/profile/constants/profile.keys';
import type { UpdateProfileInput } from '@/modules/profile/schemas/profile.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useProfileQuery = () => {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getCurrent,
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.update(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(), profile);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
      toast.success('Profile updated successfully');
    },
    onError: (error) => toastApiError(error, 'Failed to update profile.'),
  });
};
