import { useCallback, useMemo, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import {
  PTOListStats,
  PTOListToolbar,
  PTOTableCard,
  usePTOListColumns,
} from '@/modules/hr/components/pto/list';
import {
  PTODecisionDialog,
  PTODeleteDialog,
  type PTODecisionTarget,
} from '@/modules/hr/components/pto/shared';
import {
  formatPTODate,
  getPTOEmployeeName,
  getPTOTypeLabel,
} from '@/modules/hr/components/pto/shared/pto-utils';
import {
  isPTOSortByField,
  PTO_DEFAULT_PAGE_SIZE,
} from '@/modules/hr/constants/pto/pto-list.constants';
import {
  useApprovePTOMutation,
  useDeletePTOMutation,
  usePTOListQuery,
  usePTOStatsQuery,
  useRejectPTOMutation,
} from '@/modules/hr/hooks/pto.hooks';
import { usePTOListParams } from '@/modules/hr/hooks/pto/use-pto-list-params';
import type { ListPTOParams, PTO } from '@/modules/hr/schemas/pto.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Link } from 'react-router-dom';

type PTOPipelineKey = 'pending' | 'approved' | 'rejected';

const PTO_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<PTOPipelineKey>> = [
  { key: 'pending', label: 'Pending', accent: '#b8860b' },
  { key: 'approved', label: 'Approved', accent: '#2d6a4f' },
  { key: 'rejected', label: 'Rejected', accent: '#dc2626' },
];

function classifyPTOStatus(request: PTO): PTOPipelineKey {
  const key = (request.status ?? 'PENDING').toLowerCase();
  if (key === 'approved') return 'approved';
  if (key === 'rejected') return 'rejected';
  return 'pending';
}

function PTOPipelineCard({ request }: { request: PTO }) {
  const employeeName = getPTOEmployeeName(request);
  const typeLabel = getPTOTypeLabel(request);
  const dateRange = `${formatPTODate(request.startDate)} - ${formatPTODate(request.endDate)}`;

  return (
    <Link
      to={request.id}
      className="flex flex-col gap-1 rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-zinc-400/60 dark:border-zinc-600/80 dark:bg-zinc-950/50"
    >
      <div className="truncate text-sm font-semibold leading-tight text-foreground">
        {employeeName}
      </div>
      <div className="truncate text-xs text-foreground/60">{typeLabel}</div>
      <div className="mt-1 truncate text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
        {dateRange}
      </div>
    </Link>
  );
}

export default function PTOListPage() {
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
  } = usePTOListParams();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<PTODecisionTarget | null>(null);

  const filters = useMemo<ListPTOParams>(
    () => ({
      page,
      size,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
    }),
    [page, searchQuery, size, sortBy, sortOrder]
  );

  const { data, isLoading, isError, isRefetching, refetch } = usePTOListQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = usePTOStatsQuery();
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();
  const listData = data?.data ?? [];
  const totalCount = data?.pagination.totalItems ?? 0;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const columns = usePTOListColumns({
    isDecisionPending: approveMutation.isPending || rejectMutation.isPending,
    onDelete: useCallback((request) => setDeleteTarget(request), []),
    onDecision: useCallback((target) => setDecisionTarget(target), []),
  });

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
        patches.size = next.pageSize === PTO_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const nextSortBy = isPTOSortByField(column.id) ? column.id : 'startDate';
      const nextSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: nextSortBy === 'startDate' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'desc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  const handleDecision = useCallback(
    async (target: PTODecisionTarget, note: string) => {
      const mutation = target.type === 'approve' ? approveMutation : rejectMutation;
      await mutation.mutateAsync({ id: target.id, note });
    },
    [approveMutation, rejectMutation]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteMutation, deleteTarget]);

  const [view, setView] = useViewMode<'list' | 'pipeline'>('time-off', 'list');

  return (
    <div className="container-fluid py-7.5">
      <PTOListToolbar totalCount={totalCount} searchQuery={searchQuery} />
      <PTOListStats stats={stats} isLoading={isStatsLoading} />

      <div className="mb-3 mt-5 flex justify-end">
        <ViewSwitcher
          views={[
            { key: 'list', label: 'List' },
            { key: 'pipeline', label: 'Pipeline' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      <div>
        {view === 'list' ? (
          <PTOTableCard
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
          <Card className="overflow-hidden">
            <div className="p-4 lg:p-6">
              <PipelineBoard<PTO, PTOPipelineKey>
                items={listData}
                columns={PTO_PIPELINE_COLUMNS}
                groupOf={classifyPTOStatus}
                renderCard={(request) => <PTOPipelineCard request={request} />}
                emptyLabel="No requests"
              />
            </div>
          </Card>
        )}
      </div>

      <PTODeleteDialog
        open={Boolean(deleteTarget)}
        name={deleteTarget?.name}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <PTODecisionDialog
        target={decisionTarget}
        isPending={approveMutation.isPending || rejectMutation.isPending}
        onClose={() => setDecisionTarget(null)}
        onConfirm={handleDecision}
      />
    </div>
  );
}
