import { useCallback, useEffect, useRef, useState } from 'react';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  PTO_DEFAULT_PAGE_SIZE,
  PTO_SEARCH_DEBOUNCE_MS,
  type PTOSortByField,
} from '@/modules/hr/constants/pto/pto-list.constants';
import { useSearchParams } from 'react-router-dom';

export function usePTOListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), PTO_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = (searchParams.get('sortBy') ?? 'startDate') as PTOSortByField;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? 'desc';
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        Object.entries(patch).forEach(([key, value]) => {
          if (!value) {
            next.delete(key);
            return;
          }

          next.set(key, value);
        });

        return next;
      });
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, PTO_SEARCH_DEBOUNCE_MS);
    },
    [updateParams]
  );

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchInput,
    updateParams,
    handleSearchChange,
    clearSearch: () => {
      setSearchInput('');
      updateParams({ search: undefined, page: undefined });
    },
  };
}
