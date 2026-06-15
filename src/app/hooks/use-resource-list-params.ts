import { useCallback, useEffect, useState } from 'react';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';

export type ResourceListParamPatch = Record<string, string | undefined>;

interface UseResourceListParamsOptions<TSortBy extends string> {
  defaultPageSize?: number;
  defaultSortBy: TSortBy;
  defaultSortOrder?: 'asc' | 'desc';
  searchDebounceMs?: number;
  isSortBy?: (value: string | null) => value is TSortBy;
}

export function useResourceListParams<TSortBy extends string>({
  defaultPageSize = 10,
  defaultSortBy,
  defaultSortOrder = 'asc',
  searchDebounceMs = 300,
  isSortBy,
}: UseResourceListParamsOptions<TSortBy>) {
  const { searchParams, updateParams } = useUrlParamPatch();
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), defaultPageSize);
  const searchQuery = searchParams.get('search') ?? '';
  const rawSortBy = searchParams.get('sortBy');
  const sortBy = isSortBy?.(rawSortBy) ? rawSortBy : defaultSortBy;
  const rawSortOrder = searchParams.get('sortOrder');
  const sortOrder: 'asc' | 'desc' =
    rawSortOrder === 'asc' || rawSortOrder === 'desc' ? rawSortOrder : defaultSortOrder;
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateSearchParam = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined, page: undefined });
  }, searchDebounceMs);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      updateSearchParam(value);
    },
    [updateSearchParam]
  );

  const clearSearch = useCallback(() => {
    setSearchInput('');
    updateParams({ search: undefined, page: undefined });
  }, [updateParams]);

  return {
    searchParams,
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchInput,
    defaultPageSize,
    setSearchInput,
    updateParams,
    handleSearchChange,
    clearSearch,
  };
}
