import { useCallback, useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { useOptionsByIds, type ResolvedOption } from '@/app/hooks/use-options-by-ids';
import { formatCurrency } from '@/app/lib/helpers';
import { poApi } from '@/modules/project/api/purchase-order';
import type { POListItem, POPaginatedResponse } from '@/modules/project/schemas/purchase-order';

interface PurchaseOrderFilterOptionsParams {
  projectId: string;
  /** The picker's own search box. Not URL state — it means nothing once closed. */
  search: string;
  /** Currently selected purchase order ids, so their labels can be resolved. */
  selectedIds: readonly string[];
}

export interface InvoiceFilterOptionsResult {
  options: ResolvedOption[];
  selectedOptions: ResolvedOption[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onFetchNextPage: () => void;
}

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
 * The purchase-order picker behind the invoice list's multi-value filter.
 *
 * Its vendor twin lives in the directory module as `useVendorMultiFilterOptions`
 * — vendors are filtered on from more than one list, purchase orders only from
 * this one.
 */
export function usePurchaseOrderFilterOptions({
  projectId,
  search,
  selectedIds,
}: PurchaseOrderFilterOptionsParams): InvoiceFilterOptionsResult {
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
    queryKey: ['purchase-orders', 'invoice-filter-picker', projectId, search],
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
