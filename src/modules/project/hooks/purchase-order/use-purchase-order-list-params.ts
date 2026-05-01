import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
  PURCHASE_ORDER_SEARCH_DEBOUNCE_MS,
  isPurchaseOrderSortByField,
  isValidPOStatus,
  type PurchaseOrderSortByField,
} from '@/modules/project/constants/purchase-order';
import type { POStatusName } from '@/modules/project/schemas/purchase-order';

export type PurchaseOrderListParamPatch = Record<string, string | undefined>;

export function usePurchaseOrderListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), PURCHASE_ORDER_DEFAULT_PAGE_SIZE);
  const sortBy: PurchaseOrderSortByField = isPurchaseOrderSortByField(
    searchParams.get('sortBy'),
  )
    ? (searchParams.get('sortBy') as PurchaseOrderSortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter: POStatusName | undefined = isValidPOStatus(searchParams.get('status'))
    ? (searchParams.get('status') as POStatusName)
    : undefined;
  const tradeCategoryFilter = searchParams.get('tradeCategoryId') || undefined;
  const vendorFilter = searchParams.get('vendorId') || undefined;
  const rfqFilter = searchParams.get('rfqId') || undefined;
  const searchQuery = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateParams = useCallback(
    (patch: PurchaseOrderListParamPatch) => {
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
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, PURCHASE_ORDER_SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      status: undefined,
      tradeCategoryId: undefined,
      vendorId: undefined,
      rfqId: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    tradeCategoryFilter,
    vendorFilter,
    rfqFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
