import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isPrimeChangeOrderSortByField,
  PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  PRIME_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
  type PrimeChangeOrderSortByField,
} from '@/modules/project/constants/prime-change-order';

export type PrimeChangeOrderListParamPatch = Record<string, string | undefined>;

export function usePrimeChangeOrderListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'fieldwireUpdatedAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: PRIME_CHANGE_ORDER_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is PrimeChangeOrderSortByField =>
      Boolean(value && isPrimeChangeOrderSortByField(value)),
  });
  const statusFilter = listParams.searchParams.get('statusName') ?? undefined;
  const totalCostMin = listParams.searchParams.get('totalCostMin') ?? undefined;
  const totalCostMax = listParams.searchParams.get('totalCostMax') ?? undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      statusName: undefined,
      totalCostMin: undefined,
      totalCostMax: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    statusFilter,
    totalCostMin,
    totalCostMax,
    clearFilters,
  };
}
