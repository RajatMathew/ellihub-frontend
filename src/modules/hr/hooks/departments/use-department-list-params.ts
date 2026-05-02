import { useCallback, useEffect, useRef, useState } from 'react';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  DEPARTMENT_DEFAULT_PAGE_SIZE,
  DEPARTMENT_SEARCH_DEBOUNCE_MS,
  type DepartmentSortByField,
} from '@/modules/hr/constants/departments/department-list.constants';
import { useSearchParams } from 'react-router-dom';

export type DepartmentListParamPatch = Record<string, string | undefined>;

export function useDepartmentListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEPARTMENT_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = (searchParams.get('sortBy') ?? 'name') as DepartmentSortByField;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? 'asc';
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
    (patch: DepartmentListParamPatch) => {
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
      }, DEPARTMENT_SEARCH_DEBOUNCE_MS);
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
