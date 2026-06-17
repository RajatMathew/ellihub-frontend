import { useMemo, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card, CardContent } from '@/app/components/ui/card';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { formatCurrency } from '@/app/lib/helpers';
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
import { Link, useParams } from 'react-router-dom';

type PurchaseOrderPipelineKey = 'draft' | 'issued' | 'delivered' | 'void';

const PURCHASE_ORDER_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<PurchaseOrderPipelineKey>> = [
  { key: 'draft', label: 'Draft', accent: '#6b6359' },
  { key: 'issued', label: 'Issued', accent: '#1a3a5f' },
  { key: 'delivered', label: 'Delivered', accent: '#2d6a4f' },
  { key: 'void', label: 'Void', accent: '#9a9286' },
];

const classifyPurchaseOrder = (po: POListItem): PurchaseOrderPipelineKey => {
  const status = po.status as unknown as
    | string
    | { id?: string | null; name?: string | null }
    | null
    | undefined;
  const raw =
    (typeof status === 'string'
      ? status
      : (status?.name ?? status?.id ?? '')) ?? '';
  const value = raw.toLowerCase().trim();

  if (value === 'open' || value === 'active' || value === 'issued') return 'issued';
  if (value === 'closed' || value === 'completed' || value === 'delivered') return 'delivered';
  if (value === 'voided' || value === 'cancelled' || value === 'void') return 'void';
  return 'draft';
};

const formatPurchaseOrderIssuedAt = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getPurchaseOrderTotalAmount = (po: POListItem): number => {
  const candidate =
    (po as { totalAmount?: string | number | null }).totalAmount ??
    (po as { committedAmount?: string | number | null }).committedAmount ??
    po.total;
  if (candidate === null || candidate === undefined || candidate === '') return 0;
  const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

  const [view, setView] = useViewMode<'list' | 'pipeline'>('purchase-orders', 'list');
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

        <div className="mb-3 flex justify-end">
          <ViewSwitcher
            views={[
              { key: 'list', label: 'List' },
              { key: 'pipeline', label: 'Pipeline' },
            ]}
            active={view}
            onChange={setView}
          />
        </div>

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
          {view === 'list' && (
            <PurchaseOrderListTable
              table={table}
              totalCount={totalCount}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => void refetch()}
            />
          )}
          {view === 'pipeline' && (
            <div className="px-5 py-5">
              <PipelineBoard
                items={listData}
                columns={PURCHASE_ORDER_PIPELINE_COLUMNS}
                groupOf={classifyPurchaseOrder}
                emptyLabel="No purchase orders"
                renderCard={(po) => {
                  const vendorName =
                    po.vendor?.name ??
                    (po as { vendorName?: string | null }).vendorName ??
                    'Unknown vendor';
                  const issuedAtLabel = formatPurchaseOrderIssuedAt(po.issuedAt);
                  const totalLabel = formatCurrency(getPurchaseOrderTotalAmount(po));
                  return (
                    <Link
                      to={`/app/project/${projectId}/purchase-orders/${po.id}`}
                      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Card className="rounded-sm border-zinc-300/70 bg-card shadow-none transition-colors hover:border-zinc-400/70">
                        <CardContent className="flex flex-col gap-2 p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold leading-tight text-foreground">
                              {po.poNumber ?? 'Untitled PO'}
                            </span>
                            <span className="truncate text-xs text-foreground/60">
                              {vendorName}
                            </span>
                          </div>
                          <div className="flex items-end justify-between gap-3 pt-1">
                            <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                              {issuedAtLabel ?? '—'}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {totalLabel}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                }}
              />
            </div>
          )}
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
