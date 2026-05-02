import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  GCS_DEFAULT_PAGE_SIZE,
  GCS_SEARCH_DEBOUNCE_MS,
  isGCsSortByField,
  isValidGCStatus,
  type GCsSortByField,
} from '@/modules/directory/constants/gc/gc-list.constants';
import type { GCStatus } from '@/modules/directory/schemas/gc.schema';

export type GCListParamPatch = Record<string, string | undefined>;

export function useGCListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: GCS_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    searchDebounceMs: GCS_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is GCsSortByField => Boolean(value && isGCsSortByField(value)),
  });
  const gcTypeIdFilter = listParams.searchParams.get('gcTypeId') ?? undefined;
  const statusParam = listParams.searchParams.get('status');
  const statusFilter: GCStatus | undefined = isValidGCStatus(statusParam)
    ? (statusParam as GCStatus)
    : undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      gcTypeId: undefined,
      status: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    gcTypeIdFilter,
    statusFilter,
    clearFilters,
  };
}
