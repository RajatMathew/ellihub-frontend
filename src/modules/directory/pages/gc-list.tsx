import { useCallback, useMemo } from 'react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { GCStatsCards, GCTableCard, useGCListColumns } from '@/modules/directory/components/gc';
import {
  GCS_DEFAULT_PAGE_SIZE,
  isGCsSortByField,
} from '@/modules/directory/constants/gc/gc-list.constants';
import {
  useDeleteGCMutation,
  useGCsQuery,
  useGCStatsQuery,
  useGCTypesQuery,
} from '@/modules/directory/hooks/gc.hooks';
import { useGCListParams } from '@/modules/directory/hooks/gc/use-gc-list-params';
import type { ListGCsParams } from '@/modules/directory/schemas/gc.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';

export function GCListPage() {
  const { can } = useAccess();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    gcTypeIdFilter,
    statusFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useGCListParams();

  const filters = useMemo<ListGCsParams>(
    () => ({
      page,
      limit: size,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
      gcTypeId: gcTypeIdFilter,
      status: statusFilter,
    }),
    [gcTypeIdFilter, page, searchQuery, size, sortBy, sortOrder, statusFilter]
  );

  const { data: typeTabs = [], isLoading: isTypesLoading } = useGCTypesQuery();
  const { data, isLoading, isError, refetch } = useGCsQuery(filters);
  const { data: stats } = useGCStatsQuery();
  const deleteMutation = useDeleteGCMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const visibleActiveProjects = listData.reduce((sum, gc) => sum + (gc.activeProjects ?? 0), 0);
  const visibleCommitted = listData.reduce((sum, gc) => sum + (gc.totalCommitted ?? 0), 0);
  const hasActiveFilters = Boolean(searchQuery || gcTypeIdFilter || statusFilter);

  const typeLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const type of typeTabs) {
      labels.set(type.id, type.label || type.name || type.code || type.id);
    }
    return labels;
  }, [typeTabs]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const columns = useGCListColumns({
    typeLabels,
    canUpdate: can('generalContractor', 'update'),
    canDelete: can('generalContractor', 'delete'),
    onDelete: handleDelete,
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
        patches.size = next.pageSize === GCS_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const nextSortBy = isGCsSortByField(column.id) ? column.id : 'name';
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
        title="General Contractors"
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        resultLabel="GCs"
        addLabel={can('generalContractor', 'create') ? 'Add GC' : undefined}
        addTo={can('generalContractor', 'create') ? 'create' : undefined}
        addIcon={can('generalContractor', 'create') ? <Plus className="size-4" /> : undefined}
      />

      <GCStatsCards
        totalGCs={stats?.totalGCs ?? totalCount}
        activeProjects={stats?.activeProjects ?? visibleActiveProjects}
        totalCommitted={stats?.totalCommitted ?? visibleCommitted}
      />

      <GCTableCard
        table={table}
        typeTabs={typeTabs}
        gcTypeIdFilter={gcTypeIdFilter}
        statusFilter={statusFilter}
        searchInput={searchInput}
        isLoading={isLoading}
        isTypesLoading={isTypesLoading}
        isError={isError}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onTypeChange={(typeId) => updateParams({ gcTypeId: typeId, page: undefined })}
        onStatusChange={(status) => updateParams({ status, page: undefined })}
        onClearFilters={clearFilters}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
