import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { vendorsApi } from '@/modules/directory/api/vendors.api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface UseMonthlyBillsVendorFilterOptionsParams {
  search: string;
  /** Keeps the currently selected vendors visible even when they are not on the loaded page. */
  selectedOptions?: InfiniteMultiSearchSelectOption[];
}

export function useMonthlyBillsVendorFilterOptions({
  search,
  selectedOptions = [],
}: UseMonthlyBillsVendorFilterOptionsParams) {
  const query = useInfiniteQuery({
    queryKey: ['vendors', 'monthly-bills-filter-picker', search],
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

  const options = useMemo<InfiniteMultiSearchSelectOption[]>(() => {
    const next =
      query.data?.pages.flatMap((page) =>
        page.data.map((vendor) => ({
          value: vendor.id,
          label: vendor.name,
          description: vendor.email ?? vendor.phone ?? undefined,
        }))
      ) ?? [];

    const missing = selectedOptions.filter(
      (selected) => !next.some((option) => option.value === selected.value)
    );

    return missing.length ? [...missing, ...next] : next;
  }, [query.data?.pages, selectedOptions]);

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
