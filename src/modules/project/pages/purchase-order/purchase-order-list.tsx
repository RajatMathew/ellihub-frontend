import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
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
  usePurchaseOrderVendorFilterOptions,
} from '@/modules/project/hooks/purchase-order';
import type { ListPOsParams, POListItem } from '@/modules/project/schemas/purchase-order';
import { ClipboardList, ListFilterPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';

const noop = () => {};

const STATUS_TABS = f.tabs({ key: 'status', options: [...PO_STATUS_OPTIONS] });
const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search POs...' });

/**
 * Declared without live data so `useListState` can produce the request params
 * before the vendor picker exists — the picker's trigger label is recovered from
 * the rows, which only arrive after the request. See invoice-list for the same
 * pattern.
 */
const VENDOR_SHELL = f.infiniteSelect({
  className: 'w-full sm:w-52',
  emptyMessage: 'No vendors found.',
  key: 'vendorId',
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
  const vendorFilter = state.values.vendorId;

  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;

    const po = listData.find(
      (item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter
    );

    return { label: po?.vendor?.name ?? vendorFilter, value: vendorFilter };
  }, [listData, vendorFilter]);

  const vendorPicker = usePurchaseOrderVendorFilterOptions({
    search: vendorSearch,
    selectedOption: selectedVendorOption,
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
            icon: <ClipboardList className="size-10 text-muted-foreground/50" />,
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
  picker: ReturnType<typeof usePurchaseOrderVendorFilterOptions>,
  search: string,
  onSearchChange: (value: string) => void
): typeof VENDOR_SHELL {
  return {
    ...VENDOR_SHELL,
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
