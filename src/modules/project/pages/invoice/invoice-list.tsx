import { useMemo, useState } from 'react';

import {
  DataTable,
  f,
  useListState,
  useListTable,
  withPickerData,
} from '@/app/components/data-table';
import {
  useVendorMultiFilterOptions,
  VENDOR_MULTI_FILTER,
} from '@/modules/directory/hooks/vendors/use-vendor-multi-filter-options';
import { InvoiceListStats, useInvoiceListColumns } from '@/modules/project/components/invoice';
import { ProjectListHeader } from '@/modules/project/components/shared/project-list-header';
import {
  INVOICE_DEFAULT_PAGE_SIZE,
  INVOICE_SORT_BY_OPTIONS,
} from '@/modules/project/constants/invoice';
import { useInvoiceListQuery, useInvoiceStatsQuery } from '@/modules/project/hooks/invoice';
import {
  PURCHASE_ORDER_MULTI_FILTER,
  usePurchaseOrderFilterOptions,
} from '@/modules/project/hooks/purchase-order';
import type { ListInvoiceParams } from '@/modules/project/schemas/invoice';
import { FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';

const PAYMENT_TABS = [
  { label: 'Paid', value: 'true' },
  { label: 'Unpaid', value: 'false' },
];

// The URL carries 'true'/'false'; the API expects a real boolean.
const PAYMENT_TAB_FILTER = f.tabs({
  key: 'isPaid',
  options: PAYMENT_TABS,
  toApiValue: (value) => value === 'true',
});
const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search invoices...' });

// The pickers are declared without their data, which `withPickerData` attaches
// for rendering once their queries exist.
const INVOICE_FILTERS = [
  PAYMENT_TAB_FILTER,
  SEARCH_FILTER,
  VENDOR_MULTI_FILTER,
  PURCHASE_ORDER_MULTI_FILTER,
];

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
      withPickerData(VENDOR_MULTI_FILTER, vendorPicker, vendorSearch, setVendorSearch),
      withPickerData(
        PURCHASE_ORDER_MULTI_FILTER,
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
      <ProjectListHeader
        resource="invoice"
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
