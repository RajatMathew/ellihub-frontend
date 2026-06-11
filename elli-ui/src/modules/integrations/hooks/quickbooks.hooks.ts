import { quickBooksApi } from '@/modules/integrations/api/quickbooks.api';
import { integrationsKeys } from '@/modules/integrations/constants/integrations.keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';

export const useQuickBooksStatusQuery = () =>
  useQuery({
    queryKey: integrationsKeys.quickBooksStatus(),
    queryFn: quickBooksApi.getStatus,
  });

export const useQuickBooksReferenceSyncStatusQuery = () =>
  useQuery({
    queryKey: integrationsKeys.quickBooksReferenceSyncStatus(),
    queryFn: quickBooksApi.getReferenceSyncStatus,
  });

export const useStartQuickBooksConnectionMutation = () =>
  useMutation({
    mutationFn: quickBooksApi.createAuthorizationUrl,
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (error) => toastApiError(error, 'Unable to start QuickBooks connection.'),
  });

export const useDisconnectQuickBooksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quickBooksApi.disconnect,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooks() });
      toast.success('QuickBooks disconnected.');
    },
    onError: (error) => toastApiError(error, 'Unable to disconnect QuickBooks.'),
  });
};

export const useSyncQuickBooksReferenceDataMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quickBooksApi.syncReferenceData,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooks() });
      toast.success(
        `QuickBooks sync complete: ${result.createdCount} created, ${result.updatedCount} updated.`
      );
    },
    onError: (error) => toastApiError(error, 'Failed to sync QuickBooks reference data.'),
  });
};

export const useUpdateQuickBooksReferenceAutoDailySyncMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quickBooksApi.updateReferenceAutoDailySync,
    onSuccess: async ({ autoDailySyncEnabled }) => {
      await queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooksReferenceSync() });
      toast.success(
        autoDailySyncEnabled
          ? 'QuickBooks auto daily sync enabled.'
          : 'QuickBooks auto daily sync disabled.'
      );
    },
    onError: (error) => toastApiError(error, 'Unable to update QuickBooks auto daily sync.'),
  });
};
