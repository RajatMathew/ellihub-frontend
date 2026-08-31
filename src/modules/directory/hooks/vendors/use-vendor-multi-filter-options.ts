import { useCallback, useMemo } from 'react';

import { useOptionsByIds, type ResolvedOption } from '@/app/hooks/use-options-by-ids';
import { vendorsApi } from '@/modules/directory/api/vendors.api';
import type { Vendor, VendorPaginatedResponse } from '@/modules/directory/schemas/vendor.schema';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 25;

interface UseVendorMultiFilterOptionsParams {
  /** The picker's own search box. Not URL state — it means nothing once closed. */
  search: string;
  /** Currently selected vendor ids, so their labels can be resolved. */
  selectedIds: readonly string[];
}

function toOption(vendor: Vendor): ResolvedOption {
  return {
    description: vendor.email ?? vendor.phone ?? undefined,
    label: vendor.name,
    value: vendor.id,
  };
}

/**
 * The vendor picker behind a multi-value list filter.
 *
 * One hook rather than one per list: purchase orders and invoices were already
 * running byte-identical copies of the single-value version, and a multi picker
 * has a second moving part — resolving the labels of selected vendors the loaded
 * pages do not contain — that is not worth writing twice.
 *
 * Returns everything `f.infiniteMultiSelect` needs, so a page spreads it in
 * rather than mapping fields by hand.
 */
export function useVendorMultiFilterOptions({
  search,
  selectedIds,
}: UseVendorMultiFilterOptionsParams) {
  const query = useInfiniteQuery({
    getNextPageParam: (lastPage: VendorPaginatedResponse) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      vendorsApi.list({
        limit: PAGE_SIZE,
        page: pageParam,
        search: search || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    queryKey: ['vendors', 'multi-filter-picker', search],
  });

  const options = useMemo<ResolvedOption[]>(
    () => query.data?.pages.flatMap((page) => page.data.map(toOption)) ?? [],
    [query.data?.pages]
  );

  const fetchByIds = useCallback(
    async (ids: string[]) => {
      // One page wide enough for the whole selection: these are the *selected*
      // vendors, so paginating them would leave badges unresolved.
      const response = await vendorsApi.list({ ids, limit: Math.max(ids.length, 1), page: 1 });
      return response.data;
    },
    []
  );

  const selectedOptions = useOptionsByIds({
    fetchByIds,
    ids: selectedIds,
    known: options,
    queryKey: ['vendors', 'by-ids'],
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
