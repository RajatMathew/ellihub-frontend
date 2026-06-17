import { useMemo } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  InvoiceListFilters,
  InvoiceListHeader,
  InvoiceListStats,
  InvoiceListTable,
  useInvoiceListColumns,
} from '@/modules/project/components/invoice';
import {
  INVOICE_DEFAULT_PAGE_SIZE,
  isInvoiceSortByField,
} from '@/modules/project/constants/invoice';
import {
  useInvoiceListParams,
  useInvoiceListQuery,
  useInvoiceStatsQuery,
  usePurchaseOrderFilterOptions,
  useVendorFilterOptions,
  type InvoiceListParamPatch,
} from '@/modules/project/hooks/invoice';
import type { InvoiceListItem, ListInvoiceParams } from '@/modules/project/schemas/invoice';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useParams } from 'react-router-dom';

type InvoicePipelineKey = 'pending' | 'approved' | 'paid' | 'rejected';

const INVOICE_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<InvoicePipelineKey>> = [
  { key: 'pending', label: 'Pending', accent: '#6b6359' },
  { key: 'approved', label: 'Approved', accent: '#1a3a5f' },
  { key: 'paid', label: 'Paid', accent: '#2d6a4f' },
  { key: 'rejected', label: 'Rejected', accent: '#dc2626' },
];

function classifyInvoiceStatus(invoice: InvoiceListItem): InvoicePipelineKey {
  if (invoice.isPaid === true) return 'paid';
  const status = invoice.status as unknown;
  const candidate =
    status && typeof status === 'object'
      ? ((status as { name?: string; id?: string }).name ??
        (status as { name?: string; id?: string }).id ??
        '')
      : typeof status === 'string'
        ? status
        : '';
  const key = String(candidate).trim().toLowerCase();
  if (key === 'paid') return 'paid';
  if (key === 'approved') return 'approved';
  if (key === 'rejected') return 'rejected';
  if (key === 'pending' || key === 'unpaid' || key === '') return 'pending';
  return 'pending';
}

function formatInvoiceDueDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function InvoicePipelineCard({ invoice }: { invoice: InvoiceListItem }) {
  const amount =
    typeof invoice.totalAmount === 'number'
      ? invoice.totalAmount
      : typeof (invoice as unknown as { amount?: number }).amount === 'number'
        ? (invoice as unknown as { amount: number }).amount
        : 0;
  const vendorName =
    invoice.vendor?.name ??
    (invoice as unknown as { vendorName?: string }).vendorName ??
    'Unknown vendor';
  const dueDateLabel = formatInvoiceDueDate(invoice.dueDate);
  const invoiceNumber = invoice.invoiceNumber ?? invoice.id;

  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-zinc-400/60 dark:border-zinc-600/80 dark:bg-zinc-950/50">
      <div className="truncate text-sm font-semibold leading-tight text-foreground">
        {invoiceNumber}
      </div>
      <div className="truncate text-xs text-foreground/60">{vendorName}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span
          className={cn(
            'text-[0.625rem] font-medium text-muted-foreground',
            !dueDateLabel && 'invisible',
          )}
        >
          {dueDateLabel ? `Due ${dueDateLabel}` : 'placeholder'}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );
}

export function InvoiceListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const listParams = useInvoiceListParams();
  const {
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
  } = listParams;

  const filters: ListInvoiceParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    vendorId: vendorFilter,
    purchaseOrderId: purchaseOrderFilter,
    isPaid: paidFilter,
  };

  const [view, setView] = useViewMode<'list' | 'pipeline'>('invoices', 'list');

  const { data, isLoading, isError, refetch } = useInvoiceListQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useInvoiceStatsQuery(projectId);
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters =
    !!searchQuery || !!vendorFilter || !!purchaseOrderFilter || paidFilter !== undefined;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;
    const invoice = listData.find(
      (item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter
    );
    return { value: vendorFilter, label: invoice?.vendor?.name ?? vendorFilter };
  }, [listData, vendorFilter]);

  const selectedPurchaseOrderOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!purchaseOrderFilter) return undefined;
    const invoice = listData.find(
      (item) =>
        item.purchaseOrderId === purchaseOrderFilter ||
        item.purchaseOrder?.id === purchaseOrderFilter
    );
    return {
      value: purchaseOrderFilter,
      label: invoice?.purchaseOrder?.poNumber ?? purchaseOrderFilter,
      description: invoice?.vendor?.name ?? undefined,
    };
  }, [listData, purchaseOrderFilter]);

  const vendorPicker = useVendorFilterOptions({
    search: debouncedVendorSearch,
    selectedOption: selectedVendorOption,
  });
  const purchaseOrderPicker = usePurchaseOrderFilterOptions({
    projectId,
    search: debouncedPurchaseOrderSearch,
    selectedOption: selectedPurchaseOrderOption,
  });
  const columns = useInvoiceListColumns(projectId);
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: InvoiceListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === INVOICE_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const newSortBy = isInvoiceSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <InvoiceListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
      <InvoiceListStats stats={stats} isLoading={isStatsLoading} />

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
        <InvoiceListFilters
          paidFilter={paidFilter}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          vendorSearch={vendorSearch}
          purchaseOrderSearch={purchaseOrderSearch}
          vendorFilter={vendorFilter}
          purchaseOrderFilter={purchaseOrderFilter}
          vendorPicker={vendorPicker}
          purchaseOrderPicker={purchaseOrderPicker}
          onSearchChange={handleSearchChange}
          onVendorSearchChange={setVendorSearch}
          onPurchaseOrderSearchChange={setPurchaseOrderSearch}
          onUpdateParams={updateParams}
          onClearFilters={clearFilters}
        />
        {view === 'list' ? (
          <InvoiceListTable
            table={table}
            totalCount={totalCount}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="p-4 lg:p-6">
            <PipelineBoard<InvoiceListItem, InvoicePipelineKey>
              items={listData}
              columns={INVOICE_PIPELINE_COLUMNS}
              groupOf={classifyInvoiceStatus}
              renderCard={(invoice) => <InvoicePipelineCard invoice={invoice} />}
              emptyLabel="No invoices"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
