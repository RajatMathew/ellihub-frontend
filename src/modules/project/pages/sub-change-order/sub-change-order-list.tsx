import { useMemo } from 'react';

import { Card } from '@/app/components/ui/card';
import {
  SubChangeOrderListFilters,
  SubChangeOrderListHeader,
  SubChangeOrderListStats,
  SubChangeOrderListTable,
  useSubChangeOrderListColumns,
} from '@/modules/project/components/sub-change-order';
import {
  isSubChangeOrderSortByField,
  SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
} from '@/modules/project/constants/sub-change-order';
import {
  useSCOChangeTypesQuery,
  useSCOsQuery,
  useSCOStatsQuery,
  useSubChangeOrderListParams,
  type SubChangeOrderListParamPatch,
} from '@/modules/project/hooks/sub-change-order';
import type { ListSCOsParams } from '@/modules/project/schemas/sub-change-order';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useParams } from 'react-router-dom';

export function SubChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    changeTypeFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useSubChangeOrderListParams();

  const filters: ListSCOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    changeTypeId: changeTypeFilter,
  };

  const { data, isLoading, isError, refetch } = useSCOsQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useSCOStatsQuery(projectId);
  const { data: changeTypes } = useSCOChangeTypesQuery();
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters = !!searchQuery || !!statusFilter || !!changeTypeFilter;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );
  const changeTypeLabelById = useMemo(
    () =>
      new Map(
        (changeTypes ?? []).map((type) => [
          type.id,
          type.label ?? type.name ?? type.code ?? type.id,
        ])
      ),
    [changeTypes]
  );

  const columns = useSubChangeOrderListColumns({ projectId, changeTypeLabelById });
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
      const patches: SubChangeOrderListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const newSortBy = isSubChangeOrderSortByField(column.id) ? column.id : 'createdAt';
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
      <SubChangeOrderListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
      <SubChangeOrderListStats stats={stats} isLoading={isStatsLoading} />

      <Card className="overflow-hidden">
        <SubChangeOrderListFilters
          statusFilter={statusFilter}
          changeTypeFilter={changeTypeFilter}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          changeTypes={changeTypes}
          onSearchChange={handleSearchChange}
          onUpdateParams={updateParams}
          onClearFilters={clearFilters}
        />
        <SubChangeOrderListTable
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
