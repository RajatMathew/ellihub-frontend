import { useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { vendorsApi } from '@/modules/directory/api/vendors.api';

interface UsePurchaseOrderVendorFilterOptionsParams {
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
}

export function usePurchaseOrderVendorFilterOptions({
  search,
  selectedOption,
}: UsePurchaseOrderVendorFilterOptionsParams) {
  const query = useInfiniteQuery({
    queryKey: ['vendors', 'purchase-order-filter-picker', search],
    queryFn: ({ pageParam }) =>
      vendorsApi.list({
        search: search || undefined,
        page: pageParam,
        limit: 25,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
  });

  const options = useMemo(() => {
    const next =
      query.data?.pages.flatMap((page) =>
        page.data.map((vendor) => ({
          value: vendor.id,
          label: vendor.name,
          description: vendor.email ?? vendor.phone ?? undefined,
        })),
      ) ?? [];

    if (selectedOption && !next.some((option) => option.value === selectedOption.value)) {
      return [selectedOption, ...next];
    }

    return next;
  }, [query.data?.pages, selectedOption]);

  return {
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}
