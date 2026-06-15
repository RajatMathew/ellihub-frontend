import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';
import { primeChangeOrderKeys } from '@/modules/project/constants/prime-change-order';
import { synchronizationApi } from '@/modules/synchronization/api/synchronization.api';
import { synchronizationKeys } from '@/modules/synchronization/constants/synchronization.keys';

export const useFieldwireSyncStatusQuery = (enabled = true) =>
  useQuery({
    queryKey: synchronizationKeys.fieldwireStatus(),
    queryFn: synchronizationApi.getFieldwireStatus,
    enabled,
  });

export const useSyncFieldwireMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: synchronizationApi.syncFieldwire,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: synchronizationKeys.fieldwire() }),
        queryClient.invalidateQueries({ queryKey: primeChangeOrderKeys.all }),
      ]);

      toast.success(
        `Fieldwire sync complete: ${result.succeeded}/${result.attempted} project${
          result.attempted === 1 ? '' : 's'
        } synced.`
      );
    },
    onError: (error) => toastApiError(error, 'Failed to sync Fieldwire.'),
  });
};
