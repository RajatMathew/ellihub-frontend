import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isRFQSortByField,
  RFQ_DEFAULT_PAGE_SIZE,
  RFQ_SEARCH_DEBOUNCE_MS,
  type RFQSortByField,
} from '@/modules/project/constants/rfq';

export type RFQListParamPatch = Record<string, string | undefined>;

export function useRFQListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: RFQ_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: RFQ_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is RFQSortByField => Boolean(value && isRFQSortByField(value)),
  });
  const statusFilter = listParams.searchParams.get('statusId') ?? undefined;
  const trackFilter = listParams.searchParams.get('track') ?? undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      statusId: undefined,
      track: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    statusFilter,
    trackFilter,
    clearFilters,
  };
}
