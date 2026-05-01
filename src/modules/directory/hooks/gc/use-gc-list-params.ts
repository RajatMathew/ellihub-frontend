import { useCallback, useEffect, useState } from 'react';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  GCS_DEFAULT_PAGE_SIZE,
  GCS_SEARCH_DEBOUNCE_MS,
  isGCsSortByField,
  isValidGCStatus,
  type GCsSortByField,
} from '@/modules/directory/constants/gc/gc-list.constants';
import type { GCStatus } from '@/modules/directory/schemas/gc.schema';
import { useSearchParams } from 'react-router-dom';

export type GCListParamPatch = Record<string, string | undefined>;

export function useGCListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), GCS_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: GCsSortByField = isGCsSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as GCsSortByField)
    : 'name';
  const sortOrder: 'asc' | 'desc' = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const gcTypeIdFilter = searchParams.get('gcTypeId') ?? undefined;
  const statusFilter: GCStatus | undefined = isValidGCStatus(searchParams.get('status'))
    ? (searchParams.get('status') as GCStatus)
    : undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: GCListParamPatch) => {
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
    [setSearchParams]
  );

  const updateSearchParam = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined, page: undefined });
  }, GCS_SEARCH_DEBOUNCE_MS);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      updateSearchParam(value);
    },
    [updateSearchParam]
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      gcTypeId: undefined,
      status: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    gcTypeIdFilter,
    statusFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
