import { useCallback, useState } from 'react';

import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  INVOICE_DEFAULT_PAGE_SIZE,
  INVOICE_SEARCH_DEBOUNCE_MS,
  isInvoiceSortByField,
  type InvoiceSortByField,
} from '@/modules/project/constants/invoice';

export type InvoiceListParamPatch = Record<string, string | undefined>;

export function useInvoiceListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: INVOICE_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: INVOICE_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is InvoiceSortByField => Boolean(value && isInvoiceSortByField(value)),
  });
  const vendorFilter = listParams.searchParams.get('vendorId') || undefined;
  const purchaseOrderFilter = listParams.searchParams.get('purchaseOrderId') || undefined;
  const paidParam = listParams.searchParams.get('isPaid');
  const paidFilter = paidParam === 'true' ? true : paidParam === 'false' ? false : undefined;

  const [vendorSearch, setVendorSearch] = useState('');
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');
  const debouncedVendorSearch = useDebouncedValue(vendorSearch.trim(), 250);
  const debouncedPurchaseOrderSearch = useDebouncedValue(purchaseOrderSearch.trim(), 250);

  const updateParams = useCallback(
    (patch: InvoiceListParamPatch) => {
      if (Object.prototype.hasOwnProperty.call(patch, 'vendorId') && !patch.vendorId) {
        setVendorSearch('');
      }

      if (
        Object.prototype.hasOwnProperty.call(patch, 'purchaseOrderId') &&
        !patch.purchaseOrderId
      ) {
        setPurchaseOrderSearch('');
      }

      listParams.updateParams(patch);
    },
    [listParams]
  );

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    setVendorSearch('');
    setPurchaseOrderSearch('');
    listParams.updateParams({
      search: undefined,
      vendorId: undefined,
      purchaseOrderId: undefined,
      isPaid: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    vendorFilter,
    purchaseOrderFilter,
    paidFilter,
    vendorSearch,
    purchaseOrderSearch,
    debouncedVendorSearch,
    debouncedPurchaseOrderSearch,
    setVendorSearch,
    setPurchaseOrderSearch,
    updateParams,
    clearFilters,
  };
}
