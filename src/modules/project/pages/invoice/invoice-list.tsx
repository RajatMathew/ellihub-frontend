import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { useVendorMultiFilterOptions } from '@/modules/directory/hooks/vendors/use-vendor-multi-filter-options';
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
 * The picker's own query cannot be built before `useListState` exists, because
 * the selected ids it has to resolve labels for live in the URL state — but
 * `useListState` needs the schema. Declaring the keys up front breaks that
 * cycle: it only ever reads `key` and `apiKey`, and the live data is attached
 * afterwards for rendering through `DataTable`'s `filters` prop.
 *
 * Both pickers take several values at once. The URL holds the comma-separated
 * list the API's filters already accept; `state.listValues[key]` is the same
 * value as an array.
 */
function pickerShell(key: 'vendorId' | 'purchaseOrderId') {
  const isVendor = key === 'vendorId';

  return f.infiniteMultiSelect({
    className: isVendor ? 'w-full sm:w-52' : 'w-full sm:w-56',
    emptyMessage: isVendor ? 'No vendors found.' : 'No purchase orders found.',
    key,
    label: isVendor ? 'Vendors' : 'Purchase Orders',
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
    ...picker,
    // Clearing the filter clears the picker's own search box too — the URL knows
    // nothing about it, so nothing else would.
    onClear: () => onSearchChange(''),
    onSearchChange,
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

  // Labels come from each picker's own endpoint rather than from the rows: with
  // several values selected, one of them may own no row on this page, and on a
  // deep link none of them do.
  const vendorPicker = useVendorMultiFilterOptions({
    search: vendorSearch,
    selectedIds: state.listValues.vendorId ?? [],
  });
  const purchaseOrderPicker = usePurchaseOrderFilterOptions({
    projectId,
    search: purchaseOrderSearch,
    selectedIds: state.listValues.purchaseOrderId ?? [],
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
