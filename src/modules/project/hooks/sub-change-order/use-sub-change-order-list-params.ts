import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  SUB_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
  isSubChangeOrderSortByField,
  isValidSCOStatus,
  type SubChangeOrderSortByField,
} from '@/modules/project/constants/sub-change-order';
import type { SCOStatusName } from '@/modules/project/schemas/sub-change-order';

export type SubChangeOrderListParamPatch = Record<string, string | undefined>;

export function useSubChangeOrderListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE);
  const sortBy: SubChangeOrderSortByField = isSubChangeOrderSortByField(
    searchParams.get('sortBy'),
  )
    ? (searchParams.get('sortBy') as SubChangeOrderSortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter: SCOStatusName | undefined = isValidSCOStatus(
    searchParams.get('status'),
  )
    ? (searchParams.get('status') as SCOStatusName)
    : undefined;
  const changeTypeFilter = searchParams.get('changeTypeId') || undefined;
  const searchQuery = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: SubChangeOrderListParamPatch) => {
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

  const updateSearchParam = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined, page: undefined });
  }, SUB_CHANGE_ORDER_SEARCH_DEBOUNCE_MS);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      updateSearchParam(value);
    },
    [updateSearchParam],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      status: undefined,
      changeTypeId: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    changeTypeFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
