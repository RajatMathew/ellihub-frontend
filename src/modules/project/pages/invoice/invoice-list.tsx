import { useMemo } from 'react';

import { Card } from '@/app/components/ui/card';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
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
import type { ListInvoiceParams } from '@/modules/project/schemas/invoice';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useParams } from 'react-router-dom';

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
        <InvoiceListTable
          table={table}
          totalCount={totalCount}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      </Card>
    </div>
  );
}
