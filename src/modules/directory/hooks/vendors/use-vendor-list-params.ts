import { useCallback, useEffect, useState } from 'react';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  isValidVendorStatus,
  isVendorsSortByField,
  VENDORS_DEFAULT_PAGE_SIZE,
  VENDORS_SEARCH_DEBOUNCE_MS,
  type VendorsSortByField,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import type { VendorStatus } from '@/modules/directory/schemas/vendor.schema';
import { useSearchParams } from 'react-router-dom';

export type VendorListParamPatch = Record<string, string | undefined>;

export function useVendorListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), VENDORS_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: VendorsSortByField = isVendorsSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as VendorsSortByField)
    : 'name';
  const sortOrder: 'asc' | 'desc' = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const typeFilter = searchParams.get('type') || undefined;
  const statusFilter: VendorStatus | undefined = isValidVendorStatus(searchParams.get('status'))
    ? (searchParams.get('status') as VendorStatus)
    : undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: VendorListParamPatch) => {
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
  }, VENDORS_SEARCH_DEBOUNCE_MS);

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
      type: undefined,
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
    typeFilter,
    statusFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
