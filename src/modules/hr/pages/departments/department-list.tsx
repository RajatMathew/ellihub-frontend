import { useCallback, useMemo, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
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
import type { Department, ListDepartmentsParams } from '@/modules/hr/schemas/department.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Link } from 'react-router-dom';

type DepartmentPipelineKey = 'empty' | 'small' | 'medium' | 'large';

const DEPARTMENT_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<DepartmentPipelineKey>> = [
  { key: 'empty', label: 'Empty', accent: '#9a9286' },
  { key: 'small', label: 'Small (1-3)', accent: '#6b6359' },
  { key: 'medium', label: 'Medium (4-9)', accent: '#1a3a5f' },
  { key: 'large', label: 'Large (10+)', accent: '#2d6a4f' },
];

function classifyDepartmentSize(dept: Department): DepartmentPipelineKey {
  const count = dept.employeeCount ?? 0;
  if (count === 0) return 'empty';
  if (count <= 3) return 'small';
  if (count <= 9) return 'medium';
  return 'large';
}

function DepartmentPipelineCard({ dept }: { dept: Department }) {
  const count = dept.employeeCount ?? 0;
  return (
    <Link
      to={`/app/hr/departments/${dept.id}`}
      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-1.5 rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-zinc-400/60 dark:border-zinc-600/80 dark:bg-zinc-950/50">
        <div className="truncate text-sm font-semibold leading-tight text-foreground">
          {dept.name}
        </div>
        {dept.description ? (
          <div className="line-clamp-2 text-xs text-foreground/60">{dept.description}</div>
        ) : null}
        <div className="mt-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
          {count} {count === 1 ? 'member' : 'members'}
        </div>
      </div>
    </Link>
  );
}

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

  const [view, setView] = useViewMode<'list' | 'pipeline'>('departments', 'list');

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
      ) : (
        <div className="p-4 lg:p-6">
          <PipelineBoard<Department, DepartmentPipelineKey>
            items={listData}
            columns={DEPARTMENT_PIPELINE_COLUMNS}
            groupOf={classifyDepartmentSize}
            renderCard={(dept) => <DepartmentPipelineCard dept={dept} />}
            emptyLabel="No departments"
          />
        </div>
      )}

      <DepartmentDeleteDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
