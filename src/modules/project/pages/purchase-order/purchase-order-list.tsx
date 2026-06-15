import { useMemo, useState } from 'react';

import { Card } from '@/app/components/ui/card';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import {
  getPurchaseOrderRfqLabel,
  PurchaseOrderCancelDialog,
  PurchaseOrderListFilters,
  PurchaseOrderListHeader,
  PurchaseOrderListStats,
  PurchaseOrderListTable,
  usePurchaseOrderListColumns,
} from '@/modules/project/components/purchase-order';
import {
  isPurchaseOrderSortByField,
  PURCHASE_ORDER_DEFAULT_PAGE_SIZE,
} from '@/modules/project/constants/purchase-order';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useCancelPOMutation,
  usePOsQuery,
  usePOStatsQuery,
  usePurchaseOrderListParams,
  usePurchaseOrderVendorFilterOptions,
  type PurchaseOrderListParamPatch,
} from '@/modules/project/hooks/purchase-order';
import type { ListPOsParams, POListItem } from '@/modules/project/schemas/purchase-order';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useParams } from 'react-router-dom';

export default function ProjectPOs() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const {
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
  } = usePurchaseOrderListParams();

  const [vendorSearch, setVendorSearch] = useState('');
  const debouncedVendorSearch = useDebouncedValue(vendorSearch.trim(), 250);

  const filters: ListPOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    tradeCategoryId: tradeCategoryFilter,
    vendorId: vendorFilter,
    rfqId: rfqFilter,
  };

  const hasActiveFilters =
    !!searchQuery || !!statusFilter || !!tradeCategoryFilter || !!vendorFilter || !!rfqFilter;

  const { data, isLoading, isError, refetch } = usePOsQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = usePOStatsQuery(projectId);
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const cancelMutation = useCancelPOMutation();
  const [cancelTarget, setCancelTarget] = useState<POListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasReadableRfq = listData.some((po) => !!getPurchaseOrderRfqLabel(po));
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );
  const tradeCategoryLabelById = useMemo(
    () => new Map((tradeCategories ?? []).map((cat) => [cat.id, cat.label ?? cat.name ?? cat.id])),
    [tradeCategories]
  );
  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;
    const po = listData.find(
      (item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter
    );
    return {
      value: vendorFilter,
      label: po?.vendor?.name ?? vendorFilter,
    };
  }, [listData, vendorFilter]);
  const vendorPicker = usePurchaseOrderVendorFilterOptions({
    search: debouncedVendorSearch,
    selectedOption: selectedVendorOption,
  });

  const columns = usePurchaseOrderListColumns({
    projectId,
    tradeCategoryLabelById,
    onCancel: (po) => {
      setCancelTarget(po);
      setCancelReason('');
    },
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
      columnVisibility: {
        rfqId: hasReadableRfq,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: PurchaseOrderListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === PURCHASE_ORDER_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }

      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      if (!column) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const newSortBy = isPurchaseOrderSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  const handleClearFilters = () => {
    setVendorSearch('');
    clearFilters();
  };

  return (
    <>
      <div className="container-fluid py-7.5">
        <PurchaseOrderListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
        <PurchaseOrderListStats stats={stats} isLoading={isStatsLoading} />

        <Card className="overflow-hidden">
          <PurchaseOrderListFilters
            statusFilter={statusFilter}
            tradeCategoryFilter={tradeCategoryFilter}
            vendorFilter={vendorFilter}
            hasActiveFilters={hasActiveFilters}
            searchInput={searchInput}
            vendorSearch={vendorSearch}
            vendorPicker={vendorPicker}
            tradeCategories={tradeCategories}
            onSearchChange={handleSearchChange}
            onVendorSearchChange={setVendorSearch}
            onUpdateParams={updateParams}
            onClearFilters={handleClearFilters}
          />
          <PurchaseOrderListTable
            table={table}
            totalCount={totalCount}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
          />
        </Card>
      </div>

      <PurchaseOrderCancelDialog
        open={!!cancelTarget}
        purchaseOrderLabel={cancelTarget?.poNumber ?? 'this PO'}
        reason={cancelReason}
        isPending={cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
        onReasonChange={setCancelReason}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancelMutation.mutate(
            { id: cancelTarget.id, reason: cancelReason.trim() },
            {
              onSuccess: () => {
                setCancelTarget(null);
                setCancelReason('');
              },
            }
          );
        }}
      />
    </>
  );
}
