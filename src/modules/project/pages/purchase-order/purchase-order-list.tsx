import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { useVendorMultiFilterOptions } from '@/modules/directory/hooks/vendors/use-vendor-multi-filter-options';
import {
  getPurchaseOrderRfqLabel,
  PurchaseOrderCancelDialog,
  PurchaseOrderListHeader,
  PurchaseOrderListStats,
  PurchaseOrderMobileCard,
  usePurchaseOrderListColumns,
} from '@/modules/project/components/purchase-order';
import {
  PO_STATUS_OPTIONS,
  PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
  PURCHASE_ORDER_SORT_BY_OPTIONS,
} from '@/modules/project/constants/purchase-order';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useCancelPOMutation,
  usePOsQuery,
  usePOStatsQuery,
} from '@/modules/project/hooks/purchase-order';
import type { ListPOsParams, POListItem } from '@/modules/project/schemas/purchase-order';
import { ClipboardList, ListFilterPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';

const noop = () => {};

const STATUS_TABS = f.tabs({ key: 'status', options: [...PO_STATUS_OPTIONS] });
const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search POs...' });

/**
 * Declared without live data so `useListState` can produce the request params
 * before the picker's own query runs — `useListState` reads only `key` here, and
 * the options, search state and callbacks are attached below for rendering. See
 * invoice-list for the same pattern.
 *
 * Several vendors at once: the value is the comma-separated list the API's
 * `vendorId` filter already accepts, and `state.listValues.vendorId` is the same
 * value as an array.
 */
const VENDOR_SHELL = f.infiniteMultiSelect({
  className: 'w-full sm:w-52',
  emptyMessage: 'No vendors found.',
  key: 'vendorId',
  label: 'Vendors',
  onSearchChange: noop,
  options: [],
  placeholder: 'All Vendors',
  search: '',
  searchPlaceholder: 'Search vendors...',
});

/** Arrives by deep link from an RFQ; no control of its own. */
const RFQ_FILTER = f.hidden({ key: 'rfqId' });

export default function ProjectPOs() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const [vendorSearch, setVendorSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<POListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');

  const tradeFilter = useMemo(
    () =>
      f.select({
        className: 'sm:w-48',
        icon: ListFilterPlus,
        key: 'tradeCategoryId',
        options: (tradeCategories ?? []).map((option) => ({
          label: option.label ?? option.name ?? option.id,
          value: option.id,
        })),
        placeholder: 'All Trades',
      }),
    [tradeCategories]
  );

  const filters = useMemo(
    () => [STATUS_TABS, SEARCH_FILTER, VENDOR_SHELL, tradeFilter, RFQ_FILTER],
    [tradeFilter]
  );

  const state = useListState({
    filters,
    pageSize: PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: PURCHASE_ORDER_SORT_BY_OPTIONS, order: 'desc' },
  });

  const purchaseOrdersQuery = usePOsQuery({
    ...state.apiParams,
    projectId,
  } as ListPOsParams);
  const statsQuery = usePOStatsQuery(projectId);
  const cancelMutation = useCancelPOMutation();

  const listData = useMemo(
    () => purchaseOrdersQuery.data?.data ?? [],
    [purchaseOrdersQuery.data?.data]
  );

  // Labels come from the vendors endpoint rather than from the rows: with
  // several vendors selected, one of them may own no row on this page, and on a
  // deep link none of them do.
  const vendorPicker = useVendorMultiFilterOptions({
    search: vendorSearch,
    selectedIds: state.listValues.vendorId ?? [],
  });

  const renderFilters = useMemo(
    () => [
      STATUS_TABS,
      SEARCH_FILTER,
      withVendorData(vendorPicker, vendorSearch, setVendorSearch),
      tradeFilter,
      RFQ_FILTER,
    ],
    [tradeFilter, vendorPicker, vendorSearch]
  );

  const tradeCategoryLabelById = useMemo(
    () => new Map((tradeCategories ?? []).map((cat) => [cat.id, cat.label ?? cat.name ?? cat.id])),
    [tradeCategories]
  );

  const handleCancel = (po: POListItem) => {
    setCancelTarget(po);
    setCancelReason('');
  };

  const columns = usePurchaseOrderListColumns({
    onCancel: handleCancel,
    projectId,
    tradeCategoryLabelById,
  });

  // The RFQ column only earns its width when some row on this page has one.
  const hasReadableRfq = listData.some((po) => Boolean(getPurchaseOrderRfqLabel(po)));

  const list = useListTable({
    columns,
    columnVisibility: { rfqId: hasReadableRfq },
    getRowId: (po) => po.id,
    query: purchaseOrdersQuery,
    rows: listData,
    state,
    totalCount: purchaseOrdersQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  const closeCancelDialog = () => {
    setCancelTarget(null);
    setCancelReason('');
  };

  return (
    <>
      <div className="container-fluid py-7.5">
        <PurchaseOrderListHeader
          hasActiveFilters={state.hasActiveFilters}
          isLoading={list.isInitialLoading}
          totalCount={list.totalCount}
        />
        <PurchaseOrderListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

        <DataTable
          ariaLabel="Purchase orders"
          className="overflow-hidden"
          empty={{
            description: 'Purchase orders will appear here once created.',
            icon: ClipboardList,
            title: 'No purchase orders yet',
          }}
          error={{ title: 'Failed to load purchase orders' }}
          filters={renderFilters}
          list={list}
          mobileItem={(po) => <PurchaseOrderMobileCard onCancel={handleCancel} po={po} />}
          state={state}
          tableClassNames={{ base: 'min-w-full' }}
          tableLayout={{ dense: true, width: 'auto' }}
        />
      </div>

      <PurchaseOrderCancelDialog
        isPending={cancelMutation.isPending}
        open={Boolean(cancelTarget)}
        purchaseOrderLabel={cancelTarget?.poNumber ?? 'this PO'}
        reason={cancelReason}
        onConfirm={() => {
          if (!cancelTarget) return;

          cancelMutation.mutate(
            { id: cancelTarget.id, reason: cancelReason.trim() },
            { onSuccess: closeCancelDialog }
          );
        }}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
        onReasonChange={setCancelReason}
      />
    </>
  );
}

function withVendorData(
  picker: ReturnType<typeof useVendorMultiFilterOptions>,
  search: string,
  onSearchChange: (value: string) => void
): typeof VENDOR_SHELL {
  return {
    ...VENDOR_SHELL,
    ...picker,
    // Clearing the filter clears the picker's own search box too — the URL knows
    // nothing about it, so nothing else would.
    onClear: () => onSearchChange(''),
    onSearchChange,
    search,
  };
}
