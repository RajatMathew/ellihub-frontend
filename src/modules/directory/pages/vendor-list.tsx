import { useCallback, useMemo } from 'react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import {
  useVendorListColumns,
  VendorsTableCard,
  VendorStatsCards,
} from '@/modules/directory/components/vendors';
import { getVendorCommitmentSummaries } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import {
  isVendorsSortByField,
  VENDORS_DEFAULT_PAGE_SIZE,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import {
  useDeleteVendorMutation,
  useVendorsQuery,
  useVendorStatsQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import { useVendorListParams } from '@/modules/directory/hooks/vendors/use-vendor-list-params';
import type { ListVendorsParams } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';

export function VendorListPage() {
  const { can } = useAccess();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    typeFilter,
    statusFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useVendorListParams();

  const filters = useMemo<ListVendorsParams>(
    () => ({
      page,
      limit: size,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
      type: typeFilter,
      status: statusFilter,
    }),
    [page, searchQuery, size, sortBy, sortOrder, statusFilter, typeFilter]
  );

  const { data: stats, isLoading: isStatsLoading } = useVendorStatsQuery();
  const { data: typeTabs = [], isLoading: isTypesLoading } = useVendorTypesQuery();
  const { data, isLoading, isError, refetch } = useVendorsQuery(filters);
  const purchaseOrdersQuery = usePOsQuery({
    page: 1,
    size: 10000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const deleteMutation = useDeleteVendorMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters = Boolean(searchQuery || typeFilter || statusFilter);
  const commitmentsByVendorId = useMemo(
    () => getVendorCommitmentSummaries(purchaseOrdersQuery.data?.data ?? []),
    [purchaseOrdersQuery.data?.data]
  );
  const totalCommitted =
    purchaseOrdersQuery.data?.data != null
      ? Array.from(commitmentsByVendorId.values()).reduce(
          (sum, commitment) => sum + commitment.totalCommitted,
          0
        )
      : (stats?.totalCommitted ?? 0);

  const totalVendors = stats?.totalVendors ?? totalCount;
  const typeLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const type of typeTabs) {
      labels.set(type.id, type.label || type.code || type.id);
    }
    return labels;
  }, [typeTabs]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const columns = useVendorListColumns({
    typeLabels,
    canUpdate: can('vendor', 'update'),
    canDelete: can('vendor', 'delete'),
    onDelete: handleDelete,
    commitmentsByVendorId,
  });

  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const table = useReactTable({
    data: listData,
    columns,
    pageCount: Math.max(1, Math.ceil(totalCount / size)),
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const patches: Record<string, string | undefined> = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }

      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === VENDORS_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const nextSortBy = isVendorsSortByField(column.id) ? column.id : 'name';
      const nextSortOrder = column.desc ? 'desc' : 'asc';

      updateParams({
        sortBy: nextSortBy === 'name' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'asc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Vendors"
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        resultLabel="Vendors"
        addLabel={can('vendor', 'create') ? 'Add Vendor' : undefined}
        addTo={can('vendor', 'create') ? 'create' : undefined}
        addIcon={can('vendor', 'create') ? <Plus className="size-4" /> : undefined}
      />

      <VendorStatsCards
        totalVendors={totalVendors}
        totalCommitted={totalCommitted}
        totalPaid={stats?.totalPaid ?? 0}
        outstandingBalance={stats?.outstandingBalance ?? 0}
        isLoading={isStatsLoading || purchaseOrdersQuery.isLoading}
      />

      <VendorsTableCard
        table={table}
        typeTabs={typeTabs}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        searchInput={searchInput}
        isLoading={isLoading}
        isTypesLoading={isTypesLoading}
        isError={isError}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onTypeChange={(typeId) => updateParams({ type: typeId, page: undefined })}
        onStatusChange={(status) => updateParams({ status, page: undefined })}
        onClearFilters={clearFilters}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
