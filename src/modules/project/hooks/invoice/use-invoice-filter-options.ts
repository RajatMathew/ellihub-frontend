import { useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { formatCurrency } from '@/app/lib/helpers';
import { vendorsApi } from '@/modules/directory/api/vendors.api';
import { poApi } from '@/modules/project/api/purchase-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

interface InvoiceFilterOptionsParams {
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
}

interface PurchaseOrderFilterOptionsParams extends InvoiceFilterOptionsParams {
  projectId: string;
}

export interface InvoiceFilterOptionsResult {
  options: InfiniteSearchSelectOption[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

function formatPurchaseOrderOption(po: POListItem): InfiniteSearchSelectOption {
  return {
    value: po.id,
    label: po.poNumber ?? po.id,
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
  };
}

export function useVendorFilterOptions({
  search,
  selectedOption,
}: InvoiceFilterOptionsParams): InvoiceFilterOptionsResult {
  const query = useInfiniteQuery({
    queryKey: ['vendors', 'invoice-filter-picker', search],
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

export function usePurchaseOrderFilterOptions({
  projectId,
  search,
  selectedOption,
}: PurchaseOrderFilterOptionsParams): InvoiceFilterOptionsResult {
  const query = useInfiniteQuery({
    queryKey: ['purchase-orders', 'invoice-filter-picker', projectId, search],
    queryFn: ({ pageParam }) =>
      poApi.list({
        projectId,
        search: search || undefined,
        page: pageParam,
        size: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled: !!projectId,
  });

  const options = useMemo(() => {
    const next =
      query.data?.pages.flatMap((page) => page.data.map(formatPurchaseOrderOption)) ?? [];

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
