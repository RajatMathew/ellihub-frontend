import { useState } from 'react';

import {
  EmployeeDeleteDialog,
  EmployeeListStats,
  EmployeeListToolbar,
  EmployeesTableCard,
  useEmployeeListColumns,
} from '@/modules/hr/components/employees/list';
import {
  useDeleteEmployeeMutation,
  useEmployeesQuery,
  useEmployeeStatsQuery,
} from '@/modules/hr/hooks/employees.hooks';
import { useEmployeeListParams } from '@/modules/hr/hooks/employees/use-employee-list-params';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

export default function EmployeeListPage() {
  const listParams = useEmployeeListParams();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useEmployeesQuery(listParams.params);
  const { data: stats, isLoading: isStatsLoading } = useEmployeeStatsQuery();
  const deleteMutation = useDeleteEmployeeMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const sorting: SortingState = [{ id: listParams.sortBy, desc: listParams.sortOrder === 'desc' }];
  const columns = useEmployeeListColumns(setDeleteTarget);
  const pageCount = Math.max(1, Math.ceil(totalCount / listParams.size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: listParams.page - 1, pageSize: listParams.size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: listParams.page - 1, pageSize: listParams.size };
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const patch: Record<string, string | undefined> = {};

      if (next.pageIndex + 1 !== listParams.page) {
        patch.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }

      if (next.pageSize !== listParams.size) {
        patch.size =
          next.pageSize === listParams.defaultPageSize ? undefined : String(next.pageSize);
        patch.page = undefined;
      }

      listParams.updateParams(patch);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      listParams.updateParams({
        sortBy: !column || column.id === 'name' ? undefined : column.id,
        sortOrder: column?.desc ? 'desc' : undefined,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <EmployeeListToolbar totalCount={totalCount} searchQuery={listParams.searchQuery} />
      <EmployeeListStats stats={stats} isLoading={isStatsLoading} />

      <EmployeesTableCard
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        searchInput={listParams.searchInput}
        searchQuery={listParams.searchQuery}
        onSearchChange={listParams.handleSearchChange}
        onClearSearch={() => {
          if (listParams.searchQuery) {
            listParams.clearSearch();
            return;
          }
          void refetch();
        }}
        onRetry={() => void refetch()}
      />

      <EmployeeDeleteDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
