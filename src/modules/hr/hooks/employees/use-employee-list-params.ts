import { useCallback, useEffect, useRef, useState } from 'react';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
  EMPLOYEE_LIST_SEARCH_DEBOUNCE_MS,
} from '@/modules/hr/constants/employees/employee-list.constants';
import type { ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';
import { useSearchParams } from 'react-router-dom';

export function useEmployeeListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

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
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, EMPLOYEE_LIST_SEARCH_DEBOUNCE_MS);
    },
    [updateParams]
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const params: ListEmployeesParams = {
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
  };

  return {
    page,
    size,
    searchQuery,
    searchInput,
    sortBy,
    sortOrder,
    params,
    defaultPageSize: EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
    updateParams,
    handleSearchChange,
    setSearchInput,
  };
}
