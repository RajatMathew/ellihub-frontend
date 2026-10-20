import { useCallback, useMemo } from 'react';

import { f, type InfiniteMultiSelectPickerData } from '@/app/components/data-table';
import { useOptionsByIds, type ResolvedOption } from '@/app/hooks/use-options-by-ids';
import { formatCurrency } from '@/app/lib/helpers';
import { poApi } from '@/modules/project/api/purchase-order';
import type { POListItem, POPaginatedResponse } from '@/modules/project/schemas/purchase-order';
import { useInfiniteQuery } from '@tanstack/react-query';

interface PurchaseOrderFilterOptionsParams {
  projectId: string;
  /** The picker's own search box. Not URL state — it means nothing once closed. */
  search: string;
  /** Currently selected purchase order ids, so their labels can be resolved. */
  selectedIds: readonly string[];
}

/**
 * The purchase order filter as a list declares it, before the picker's data
 * exists — attach that with `withPickerData`. Several orders at once: the URL
 * holds the comma-separated list the API's `purchaseOrderId` filters accept.
 */
export const PURCHASE_ORDER_MULTI_FILTER = f.infiniteMultiSelect({
  className: 'w-full sm:w-56',
  emptyMessage: 'No purchase orders found.',
  key: 'purchaseOrderId',
  label: 'Purchase Orders',
  onSearchChange: () => {},
  options: [],
  placeholder: 'All Purchase Orders',
  search: '',
  searchPlaceholder: 'Search purchase orders...',
});

function toOption(po: POListItem): ResolvedOption {
  return {
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
    label: po.poNumber ?? po.id,
    value: po.id,
  };
}

/**
 * The purchase-order picker behind a project list's multi-value filter — the
 * invoice and sub change order lists. Offers the project's own orders.
 *
 * Its vendor twin lives in the directory module as `useVendorMultiFilterOptions`.
 */
export function usePurchaseOrderFilterOptions({
  projectId,
  search,
  selectedIds,
}: PurchaseOrderFilterOptionsParams): InfiniteMultiSelectPickerData {
  const query = useInfiniteQuery({
    enabled: !!projectId,
    getNextPageParam: (lastPage: POPaginatedResponse) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      poApi.list({
        page: pageParam,
        projectId,
        search: search || undefined,
        size: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    queryKey: ['purchase-orders', 'filter-picker', projectId, search],
  });

  const options = useMemo<ResolvedOption[]>(
    () => query.data?.pages.flatMap((page) => page.data.map(toOption)) ?? [],
    [query.data?.pages]
  );

  const fetchByIds = useCallback(async (ids: string[]) => {
    // One page wide enough for the whole selection: these are the *selected*
    // purchase orders, so paginating them would leave badges unresolved. No
    // `projectId` — a selected id is already scoped by how it was chosen.
    const response = await poApi.list({ ids, page: 1, size: Math.max(ids.length, 1) });
    return response.data;
  }, []);

  const selectedOptions = useOptionsByIds({
    fetchByIds,
    ids: selectedIds,
    known: options,
    queryKey: ['purchase-orders', 'by-ids'],
    toOption,
  });

  return {
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    onFetchNextPage: () => {
      void query.fetchNextPage();
    },
    options,
    selectedOptions,
  };
}
