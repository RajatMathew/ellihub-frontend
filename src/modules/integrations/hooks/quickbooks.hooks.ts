import { useMemo } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { toastApiError } from '@/app/lib/toast-api-error';
import { quickBooksApi } from '@/modules/integrations/api/quickbooks.api';
import { integrationsKeys } from '@/modules/integrations/constants/integrations.keys';
import type {
  QuickBooksCreateVendorPayload,
  QuickBooksMapVendorPayload,
  QuickBooksPayee,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useQuickBooksStatusQuery = () =>
  useQuery({
    queryKey: integrationsKeys.quickBooksStatus(),
    queryFn: quickBooksApi.getStatus,
  });

export const useQuickBooksReferenceSyncStatusQuery = (enabled = true) =>
  useQuery({
    queryKey: integrationsKeys.quickBooksReferenceSyncStatus(),
    queryFn: quickBooksApi.getReferenceSyncStatus,
    enabled,
  });

export const useQuickBooksBankAccountsQuery = (enabled = true) =>
  useQuery({
    queryKey: integrationsKeys.quickBooksBankAccounts(),
    queryFn: quickBooksApi.listBankAccounts,
    enabled,
  });

export const useQuickBooksCategoriesQuery = (enabled = true) =>
  useQuery({
    queryKey: integrationsKeys.quickBooksCategories(),
    queryFn: quickBooksApi.listCategories,
    enabled,
  });

export const useQuickBooksVendorsQuery = (enabled = true) =>
  useQuery({
    queryKey: integrationsKeys.quickBooksVendors(),
    queryFn: quickBooksApi.listVendors,
    enabled,
  });

interface UseQuickBooksVendorOptionsParams {
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
  enabled?: boolean;
  pageSize?: number;
}

function toQuickBooksVendorOption(vendor: QuickBooksPayee): InfiniteSearchSelectOption {
  const description = [vendor.companyName, vendor.primaryEmail ?? vendor.primaryPhone]
    .filter(Boolean)
    .join(' | ');

  return {
    value: vendor.qbId,
    label: vendor.displayName,
    description: description || undefined,
    badge: vendor.active === false ? 'Inactive' : undefined,
    disabled: vendor.active === false || Boolean(vendor.deletedAt),
  };
}

function dedupeOptions(options: InfiniteSearchSelectOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

function dedupePayees(payees: QuickBooksPayee[]) {
  const seen = new Set<string>();
  return payees.filter((payee) => {
    if (seen.has(payee.qbId)) return false;
    seen.add(payee.qbId);
    return true;
  });
}

export function useQuickBooksVendorOptions({
  search,
  selectedOption,
  enabled = true,
  pageSize = 25,
}: UseQuickBooksVendorOptionsParams) {
  const query = useInfiniteQuery({
    queryKey: integrationsKeys.quickBooksVendorOptions({ search, pageSize }),
    queryFn: ({ pageParam }) =>
      quickBooksApi.listVendorOptions({
        page: pageParam,
        size: pageSize,
        search: search || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled,
  });

  const vendors = useMemo(
    () => dedupePayees(query.data?.pages.flatMap((page) => page.data) ?? []),
    [query.data?.pages]
  );

  const options = useMemo(() => {
    const fetched = vendors.map(toQuickBooksVendorOption);
    return dedupeOptions(selectedOption ? [selectedOption, ...fetched] : fetched);
  }, [selectedOption, vendors]);

  return {
    vendors,
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

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

export const useCreateQuickBooksVendorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: QuickBooksCreateVendorPayload) => quickBooksApi.createVendor(payload),
    onSuccess: async ({ mapping }) => {
      await queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooks() });
      if (mapping) {
        await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all });
      }
      toast.success('QuickBooks vendor created.');
    },
    onError: (error) => toastApiError(error, 'Unable to create QuickBooks vendor.'),
  });
};

export const useMapQuickBooksVendorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: QuickBooksMapVendorPayload) => quickBooksApi.mapVendor(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooksVendorMappings() }),
        queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all }),
      ]);
      toast.success('QuickBooks vendor mapping saved.');
    },
    onError: (error) => toastApiError(error, 'Unable to save QuickBooks vendor mapping.'),
  });
};

export const useUnmapQuickBooksVendorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quickBooksApi.unmapVendor,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationsKeys.quickBooksVendorMappings() }),
        queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all }),
      ]);
      toast.success('QuickBooks vendor unmapped.');
    },
    onError: (error) => toastApiError(error, 'Unable to remove QuickBooks vendor mapping.'),
  });
};
