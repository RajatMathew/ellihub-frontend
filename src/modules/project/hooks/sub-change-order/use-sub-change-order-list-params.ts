import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isSubChangeOrderSortByField,
  isValidSCOStatus,
  SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  SUB_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
  type SubChangeOrderSortByField,
} from '@/modules/project/constants/sub-change-order';
import type { SCOStatusName } from '@/modules/project/schemas/sub-change-order';

export type SubChangeOrderListParamPatch = Record<string, string | undefined>;

export function useSubChangeOrderListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: SUB_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is SubChangeOrderSortByField =>
      Boolean(value && isSubChangeOrderSortByField(value)),
  });
  const statusParam = listParams.searchParams.get('status');
  const statusFilter: SCOStatusName | undefined = isValidSCOStatus(statusParam)
    ? (statusParam as SCOStatusName)
    : undefined;
  const changeTypeFilter = listParams.searchParams.get('changeTypeId') || undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      status: undefined,
      changeTypeId: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    statusFilter,
    changeTypeFilter,
    clearFilters,
  };
}
