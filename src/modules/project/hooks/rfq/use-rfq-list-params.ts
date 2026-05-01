import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  RFQ_DEFAULT_PAGE_SIZE,
  RFQ_SEARCH_DEBOUNCE_MS,
  isRFQSortByField,
  type RFQSortByField,
} from '@/modules/project/constants/rfq';

export type RFQListParamPatch = Record<string, string | undefined>;

export function useRFQListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), RFQ_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: RFQSortByField = isRFQSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as RFQSortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter = searchParams.get('statusId') ?? undefined;
  const trackFilter = searchParams.get('track') ?? undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateParams = useCallback(
    (patch: RFQListParamPatch) => {
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
      }, RFQ_SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      statusId: undefined,
      track: undefined,
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
    trackFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
