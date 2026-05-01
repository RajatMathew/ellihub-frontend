import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  INVOICE_DEFAULT_PAGE_SIZE,
  INVOICE_SEARCH_DEBOUNCE_MS,
  isInvoiceSortByField,
  type InvoiceSortByField,
} from '@/modules/project/constants/invoice';

export type InvoiceListParamPatch = Record<string, string | undefined>;

export function useInvoiceListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), INVOICE_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: InvoiceSortByField = isInvoiceSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as InvoiceSortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const vendorFilter = searchParams.get('vendorId') || undefined;
  const purchaseOrderFilter = searchParams.get('purchaseOrderId') || undefined;
  const paidParam = searchParams.get('isPaid');
  const paidFilter = paidParam === 'true' ? true : paidParam === 'false' ? false : undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [vendorSearch, setVendorSearch] = useState('');
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');
  const debouncedVendorSearch = useDebouncedValue(vendorSearch.trim(), 250);
  const debouncedPurchaseOrderSearch = useDebouncedValue(purchaseOrderSearch.trim(), 250);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: InvoiceListParamPatch) => {
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

  const updateSearchParam = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined, page: undefined });
  }, INVOICE_SEARCH_DEBOUNCE_MS);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      updateSearchParam(value);
    },
    [updateSearchParam],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setVendorSearch('');
    setPurchaseOrderSearch('');
    updateParams({
      search: undefined,
      vendorId: undefined,
      purchaseOrderId: undefined,
      isPaid: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    vendorFilter,
    purchaseOrderFilter,
    paidFilter,
    searchInput,
    vendorSearch,
    purchaseOrderSearch,
    debouncedVendorSearch,
    debouncedPurchaseOrderSearch,
    updateParams,
    handleSearchChange,
    setVendorSearch,
    setPurchaseOrderSearch,
    clearFilters,
  };
}
