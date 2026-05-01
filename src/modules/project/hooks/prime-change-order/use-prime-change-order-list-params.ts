import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  PRIME_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
  isPrimeChangeOrderSortByField,
  type PrimeChangeOrderSortByField,
} from '@/modules/project/constants/prime-change-order';

export type PrimeChangeOrderListParamPatch = Record<string, string | undefined>;

export function usePrimeChangeOrderListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(
    searchParams.get('size'),
    PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  );
  const searchQuery = searchParams.get('search') ?? '';
  const statusFilter = searchParams.get('statusName') ?? undefined;
  const totalCostMin = searchParams.get('totalCostMin') ?? undefined;
  const totalCostMax = searchParams.get('totalCostMax') ?? undefined;
  const sortBy: PrimeChangeOrderSortByField = isPrimeChangeOrderSortByField(
    searchParams.get('sortBy'),
  )
    ? (searchParams.get('sortBy') as PrimeChangeOrderSortByField)
    : 'fieldwireUpdatedAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateParams = useCallback(
    (patch: PrimeChangeOrderListParamPatch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (!value) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, PRIME_CHANGE_ORDER_SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      statusName: undefined,
      totalCostMin: undefined,
      totalCostMax: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    statusFilter,
    totalCostMin,
    totalCostMax,
    sortBy,
    sortOrder,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
