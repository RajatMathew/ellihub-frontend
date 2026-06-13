import { useCallback, useMemo, useState } from 'react';

import {
  DepartmentDeleteDialog,
  DepartmentListStats,
  DepartmentListToolbar,
  DepartmentsTableCard,
  useDepartmentListColumns,
} from '@/modules/hr/components/departments/list';
import {
  DEPARTMENT_DEFAULT_PAGE_SIZE,
  isDepartmentSortByField,
} from '@/modules/hr/constants/departments/department-list.constants';
import {
  useDeleteDepartmentMutation,
  useDepartmentsQuery,
  useDepartmentStatsQuery,
} from '@/modules/hr/hooks/departments.hooks';
import { useDepartmentListParams } from '@/modules/hr/hooks/departments/use-department-list-params';
import type { ListDepartmentsParams } from '@/modules/hr/schemas/department.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

export default function DepartmentListPage() {
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchInput,
    updateParams,
    handleSearchChange,
    clearSearch,
  } = useDepartmentListParams();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    employeeCount?: number;
  } | null>(null);

  const filters = useMemo<ListDepartmentsParams>(
    () => ({
      page,
      size,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
    }),
    [page, searchQuery, size, sortBy, sortOrder]
  );

  const { data, isLoading, isError, isRefetching, refetch } = useDepartmentsQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useDepartmentStatsQuery();
  const deleteMutation = useDeleteDepartmentMutation();
  const listData = data?.data ?? [];
  const totalCount = data?.pagination.totalItems ?? 0;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const columns = useDepartmentListColumns(
    useCallback((department) => setDeleteTarget(department), [])
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
          next.pageSize === DEPARTMENT_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const nextSortBy = isDepartmentSortByField(column.id) ? column.id : 'name';
      const nextSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: nextSortBy === 'name' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'asc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if ((deleteTarget.employeeCount ?? 0) > 0) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteMutation, deleteTarget]);

  return (
    <div className="container-fluid py-7.5">
      <DepartmentListToolbar totalCount={totalCount} searchQuery={searchQuery} />
      <DepartmentListStats stats={stats} isLoading={isStatsLoading} />

      <DepartmentsTableCard
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        searchInput={searchInput}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={clearSearch}
        onRetry={() => void refetch()}
      />

      <DepartmentDeleteDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
