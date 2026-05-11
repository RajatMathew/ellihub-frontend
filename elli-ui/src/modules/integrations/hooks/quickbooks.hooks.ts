import { toastApiError } from '@/app/lib/toast-api-error';
import { quickBooksApi } from '@/modules/integrations/api/quickbooks.api';
import { integrationsKeys } from '@/modules/integrations/constants/integrations.keys';
import type { QuickBooksTransactionEntity } from '@/modules/integrations/schemas/quickbooks.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type QuickBooksTransactionsOptions = {
  enabled: boolean;
  entities?: QuickBooksTransactionEntity[];
  maxResults?: number;
};

export const useQuickBooksStatusQuery = () =>
  useQuery({
    queryKey: integrationsKeys.quickBooksStatus(),
    queryFn: quickBooksApi.getStatus,
  });

export const useQuickBooksTransactionsQuery = ({
  enabled,
  entities,
  maxResults,
}: QuickBooksTransactionsOptions) =>
  useQuery({
    queryKey: [...integrationsKeys.quickBooksTransactions(), entities, maxResults],
    queryFn: () => quickBooksApi.getTransactions({ entities, maxResults }),
    enabled,
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
