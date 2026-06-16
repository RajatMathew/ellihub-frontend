import { useMemo } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { vendorsApi } from '@/modules/directory/api/vendors.api';
import type { Vendor, VendorStatus } from '@/modules/directory/schemas/vendor.schema';
import { useInfiniteQuery } from '@tanstack/react-query';

export type VendorPickerOption = InfiniteSearchSelectOption;

interface UseVendorPickerOptionsParams {
  search: string;
  selectedOptions?: VendorPickerOption[];
  excludedIds?: string[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
  status?: VendorStatus;
}

function toVendorPickerOption(vendor: Vendor): VendorPickerOption {
  return {
    value: vendor.id,
    label: vendor.name,
    description: vendor.email ?? vendor.phone ?? undefined,
    badge: vendor.status === 'INACTIVE' ? 'Inactive' : undefined,
    disabled: vendor.status === 'INACTIVE',
  };
}

function dedupeOptions(options: VendorPickerOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

export function useVendorPickerOptions({
  search,
  selectedOptions = [],
  excludedIds = [],
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  status,
}: UseVendorPickerOptionsParams) {
  const excludedIdsKey = excludedIds.join('|');
  const query = useInfiniteQuery({
    queryKey: ['vendors', queryScope, search, status, pageSize, excludedIdsKey],
    queryFn: ({ pageParam }) =>
      vendorsApi.list({
        search: search || undefined,
        status,
        excludeIds: excludedIds.length > 0 ? excludedIds : undefined,
        page: pageParam,
        limit: pageSize,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled,
  });

  const options = useMemo(() => {
    const excluded = new Set(excludedIds);
    const selectedIds = new Set(selectedOptions.map((option) => option.value));
    const fetched =
      query.data?.pages.flatMap((page) =>
        page.data
          .map(toVendorPickerOption)
          .filter((option) => !excluded.has(option.value) || selectedIds.has(option.value)),
      ) ?? [];

    return dedupeOptions([...fetched, ...selectedOptions]);
  }, [excludedIds, query.data?.pages, selectedOptions]);

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
