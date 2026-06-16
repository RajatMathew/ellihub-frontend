import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isValidVendorStatus,
  isVendorsSortByField,
  VENDORS_DEFAULT_PAGE_SIZE,
  VENDORS_SEARCH_DEBOUNCE_MS,
  type VendorsSortByField,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import type { VendorStatus } from '@/modules/directory/schemas/vendor.schema';

export type VendorListParamPatch = Record<string, string | undefined>;

export function useVendorListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: VENDORS_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    searchDebounceMs: VENDORS_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is VendorsSortByField => Boolean(value && isVendorsSortByField(value)),
  });
  const typeFilter = listParams.searchParams.get('type') || undefined;
  const statusParam = listParams.searchParams.get('status');
  const statusFilter: VendorStatus | undefined = isValidVendorStatus(statusParam)
    ? (statusParam as VendorStatus)
    : undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      type: undefined,
      status: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    typeFilter,
    statusFilter,
    clearFilters,
  };
}
