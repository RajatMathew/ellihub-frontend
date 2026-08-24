import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import {
  InvoiceListHeader,
  InvoiceListStats,
  useInvoiceListColumns,
} from '@/modules/project/components/invoice';
import {
  INVOICE_DEFAULT_PAGE_SIZE,
  INVOICE_SORT_BY_OPTIONS,
} from '@/modules/project/constants/invoice';
import {
  useInvoiceListQuery,
  useInvoiceStatsQuery,
  usePurchaseOrderFilterOptions,
  useVendorFilterOptions,
  type InvoiceFilterOptionsResult,
} from '@/modules/project/hooks/invoice';
import type { ListInvoiceParams } from '@/modules/project/schemas/invoice';
import { FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';

const PAYMENT_TABS = [
  { label: 'Paid', value: 'true' },
  { label: 'Unpaid', value: 'false' },
];

const noop = () => {};

/**
 * A picker definition carrying its keys but no live data yet.
 *
 * The pickers cannot be built before the rows are on screen, because a picker's
 * trigger label is recovered from those rows — but the rows need the request
 * params, which need the schema. Declaring the keys up front breaks that cycle:
 * `useListState` only ever reads `key` and `apiKey`, and the live data is
 * attached afterwards for rendering through `DataTable`'s `filters` prop.
 */
function pickerShell(key: 'vendorId' | 'purchaseOrderId') {
  const isVendor = key === 'vendorId';

  return f.infiniteSelect({
    className: isVendor ? 'w-full sm:w-52' : 'w-full sm:w-56',
    emptyMessage: isVendor ? 'No vendors found.' : 'No purchase orders found.',
    key,
    onSearchChange: noop,
    options: [],
    placeholder: isVendor ? 'All Vendors' : 'All Purchase Orders',
    search: '',
    searchPlaceholder: isVendor ? 'Search vendors...' : 'Search purchase orders...',
  });
}

function withPickerData(
  shell: ReturnType<typeof pickerShell>,
  picker: InvoiceFilterOptionsResult,
  search: string,
  onSearchChange: (value: string) => void
): ReturnType<typeof pickerShell> {
  return {
    ...shell,
    hasNextPage: picker.hasNextPage,
    isFetchingNextPage: picker.isFetchingNextPage,
    isLoading: picker.isLoading,
    onClear: () => onSearchChange(''),
    onFetchNextPage: picker.fetchNextPage,
    onSearchChange,
    options: picker.options,
    search,
  };
}

// The URL carries 'true'/'false'; the API expects a real boolean.
const PAYMENT_TAB_FILTER = f.tabs({
  key: 'isPaid',
  options: PAYMENT_TABS,
  toApiValue: (value) => value === 'true',
});
const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search invoices...' });
const VENDOR_SHELL = pickerShell('vendorId');
const PURCHASE_ORDER_SHELL = pickerShell('purchaseOrderId');

const INVOICE_FILTERS = [PAYMENT_TAB_FILTER, SEARCH_FILTER, VENDOR_SHELL, PURCHASE_ORDER_SHELL];

export function InvoiceListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  // Each picker keeps its own search box, which the URL knows nothing about.
  const [vendorSearch, setVendorSearch] = useState('');
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');

  const state = useListState({
    filters: INVOICE_FILTERS,
    pageSize: INVOICE_DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: INVOICE_SORT_BY_OPTIONS, order: 'desc' },
  });

  const invoicesQuery = useInvoiceListQuery({
    ...state.apiParams,
    projectId,
  } as ListInvoiceParams);
  const statsQuery = useInvoiceStatsQuery(projectId);

  const listData = useMemo(() => invoicesQuery.data?.data ?? [], [invoicesQuery.data?.data]);
  const vendorFilter = state.values.vendorId;
  const purchaseOrderFilter = state.values.purchaseOrderId;

  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;

    const invoice = listData.find(
      (item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter
    );

    return { label: invoice?.vendor?.name ?? vendorFilter, value: vendorFilter };
  }, [listData, vendorFilter]);

  const selectedPurchaseOrderOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!purchaseOrderFilter) return undefined;

    const invoice = listData.find(
      (item) =>
        item.purchaseOrderId === purchaseOrderFilter ||
        item.purchaseOrder?.id === purchaseOrderFilter
    );

    return {
      description: invoice?.vendor?.name ?? undefined,
      label: invoice?.purchaseOrder?.poNumber ?? purchaseOrderFilter,
      value: purchaseOrderFilter,
    };
  }, [listData, purchaseOrderFilter]);

  const vendorPicker = useVendorFilterOptions({
    search: vendorSearch,
    selectedOption: selectedVendorOption,
  });
  const purchaseOrderPicker = usePurchaseOrderFilterOptions({
    projectId,
    search: purchaseOrderSearch,
    selectedOption: selectedPurchaseOrderOption,
  });

  const renderFilters = useMemo(
    () => [
      PAYMENT_TAB_FILTER,
      SEARCH_FILTER,
      withPickerData(VENDOR_SHELL, vendorPicker, vendorSearch, setVendorSearch),
      withPickerData(
        PURCHASE_ORDER_SHELL,
        purchaseOrderPicker,
        purchaseOrderSearch,
        setPurchaseOrderSearch
      ),
    ],
    [purchaseOrderPicker, purchaseOrderSearch, vendorPicker, vendorSearch]
  );

  const columns = useInvoiceListColumns(projectId);

  const list = useListTable({
    columns,
    getRowId: (invoice) => invoice.id,
    query: invoicesQuery,
    rows: listData,
    state,
    totalCount: invoicesQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  return (
    <div className="container-fluid py-7.5">
      <InvoiceListHeader
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        totalCount={list.totalCount}
      />
      <InvoiceListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="Invoices"
        className="overflow-hidden"
        empty={{
          description: 'Invoices will appear here once created.',
          icon: FileText,
          title: 'No invoices yet',
        }}
        error={{ title: 'Failed to load invoices' }}
        filters={renderFilters}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ dense: true, width: 'auto' }}
      />
    </div>
  );
}
