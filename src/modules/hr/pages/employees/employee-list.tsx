import { useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
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
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Link } from 'react-router-dom';

type EmployeePipelineKey = 'active' | 'on_leave' | 'inactive';

const EMPLOYEE_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<EmployeePipelineKey>> = [
  { key: 'active', label: 'Active', accent: '#2d6a4f' },
  { key: 'on_leave', label: 'On Leave', accent: '#b8860b' },
  { key: 'inactive', label: 'Inactive', accent: '#9a9286' },
];

function classifyEmployeeStatus(employee: Employee): EmployeePipelineKey {
  const key = (employee.status ?? 'active').toLowerCase();
  if (key === 'active') return 'active';
  if (key === 'on_leave') return 'on_leave';
  if (key === 'inactive') return 'inactive';
  return 'active';
}

function EmployeePipelineCard({ employee }: { employee: Employee }) {
  return (
    <Link
      to={employee.id}
      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-1.5 rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-zinc-400/60 dark:border-zinc-600/80 dark:bg-zinc-950/50">
        <div className="truncate text-sm font-semibold leading-tight text-foreground">
          {employee.name}
        </div>
        {employee.role?.label && (
          <div className="truncate text-xs text-foreground/60">{employee.role.label}</div>
        )}
        {employee.department?.name && (
          <div className="mt-1 truncate text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
            {employee.department.name}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function EmployeeListPage() {
  const listParams = useEmployeeListParams();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [view, setView] = useViewMode<'list' | 'pipeline'>('employees', 'list');

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

      {view === 'list' ? (
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
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 lg:p-6">
            <PipelineBoard<Employee, EmployeePipelineKey>
              items={listData}
              columns={EMPLOYEE_PIPELINE_COLUMNS}
              groupOf={classifyEmployeeStatus}
              renderCard={(employee) => <EmployeePipelineCard employee={employee} />}
              emptyLabel="No employees"
            />
          </div>
        </Card>
      )}

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
