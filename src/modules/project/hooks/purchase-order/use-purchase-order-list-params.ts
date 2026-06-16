import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isPurchaseOrderSortByField,
  isValidPOStatus,
  PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
  PURCHASE_ORDER_SEARCH_DEBOUNCE_MS,
  type PurchaseOrderSortByField,
} from '@/modules/project/constants/purchase-order';
import type { POStatusName } from '@/modules/project/schemas/purchase-order';

export type PurchaseOrderListParamPatch = Record<string, string | undefined>;

export function usePurchaseOrderListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: PURCHASE_ORDER_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is PurchaseOrderSortByField =>
      Boolean(value && isPurchaseOrderSortByField(value)),
  });
  const statusParam = listParams.searchParams.get('status');
  const statusFilter: POStatusName | undefined = isValidPOStatus(statusParam)
    ? (statusParam as POStatusName)
    : undefined;
  const tradeCategoryFilter = listParams.searchParams.get('tradeCategoryId') || undefined;
  const vendorFilter = listParams.searchParams.get('vendorId') || undefined;
  const rfqFilter = listParams.searchParams.get('rfqId') || undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      status: undefined,
      tradeCategoryId: undefined,
      vendorId: undefined,
      rfqId: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    statusFilter,
    tradeCategoryFilter,
    vendorFilter,
    rfqFilter,
    clearFilters,
  };
}
