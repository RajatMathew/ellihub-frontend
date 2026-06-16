import { useCallback, useMemo, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import {
  getRFQTrackValue,
  RFQListConfirmDialogs,
  RFQListFilters,
  RFQListHeader,
  RFQListStats,
  RFQListTable,
  useRFQListColumns,
} from '@/modules/project/components/rfq';
import { isRFQSortByField, RFQ_DEFAULT_PAGE_SIZE } from '@/modules/project/constants/rfq';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useCancelRFQMutation,
  useDeleteRFQMutation,
  useRFQListParams,
  useRFQListQuery,
  useRFQStatsQuery,
  useRFQStatusesQuery,
  type RFQListParamPatch,
} from '@/modules/project/hooks/rfq';
import type { ListRFQParams, RFQListItem } from '@/modules/project/schemas/rfq';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';

type RFQPipelineColumnKey = 'draft' | 'published' | 'awarded' | 'closed';

const RFQ_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<RFQPipelineColumnKey>> = [
  { key: 'draft', label: 'Draft', accent: '#6b6359' },
  { key: 'published', label: 'Published', accent: '#1a3a5f' },
  { key: 'awarded', label: 'Awarded', accent: '#2d6a4f' },
  { key: 'closed', label: 'Closed', accent: '#9a9286' },
];

const RFQ_VIEW_OPTIONS = [
  { key: 'list' as const, label: 'List' },
  { key: 'pipeline' as const, label: 'Pipeline' },
];

function classifyRFQ(rfq: RFQListItem): RFQPipelineColumnKey {
  const status = rfq.status;
  const raw =
    typeof status === 'string'
      ? status
      : (status?.name ?? status?.id ?? '');
  const key = raw.toLowerCase().trim();

  if (key === 'open' || key === 'active' || key === 'published') return 'published';
  if (key === 'converted' || key === 'awarded') return 'awarded';
  if (key === 'closed') return 'closed';
  if (key === 'draft') return 'draft';
  return 'draft';
}

function formatRFQDeadline(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function RFQListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    trackFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useRFQListParams();

  const filters: ListRFQParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    statusId: statusFilter,
  };

  const [view, setView] = useViewMode<'list' | 'pipeline'>('rfqs', 'list');

  const { data, isLoading, isError, refetch } = useRFQListQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useRFQStatsQuery(projectId);
  const { data: statuses } = useRFQStatusesQuery();
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const { mutate: deleteRFQ, isPending: isDeletePending } = useDeleteRFQMutation();
  const { mutate: voidRFQ, isPending: isVoidPending } = useCancelRFQMutation();
  const [deleteTarget, setDeleteTarget] = useState<RFQListItem | null>(null);
  const [voidTarget, setVoidTarget] = useState<RFQListItem | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const rawListData = useMemo(() => data?.data ?? [], [data?.data]);
  const listData = useMemo(
    () =>
      trackFilter
        ? rawListData.filter((rfq) => getRFQTrackValue(rfq) === trackFilter)
        : rawListData,
    [rawListData, trackFilter]
  );
  const totalCount = trackFilter ? listData.length : (data?.pagination?.totalItems ?? 0);
  const hasActiveFilters = !!searchQuery || !!statusFilter || !!trackFilter;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const handleDeleteTarget = useCallback((rfq: RFQListItem) => {
    setDeleteTarget(rfq);
  }, []);
  const handleVoidTarget = useCallback((rfq: RFQListItem) => {
    setVoidTarget(rfq);
    setVoidReason('');
  }, []);
  const handleCreatePOTarget = useCallback(
    (rfq: RFQListItem) => {
      navigate(`/app/project/${projectId}/purchase-orders/create?rfqId=${rfq.id}`);
    },
    [navigate, projectId]
  );
  const columns = useRFQListColumns({
    onDelete: handleDeleteTarget,
    onVoid: handleVoidTarget,
    onCreatePO: handleCreatePOTarget,
  });
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
      const patches: RFQListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size = next.pageSize === RFQ_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const newSortBy = isRFQSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    deleteRFQ(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteRFQ, deleteTarget]);

  const handleCloseVoid = useCallback(() => {
    setVoidTarget(null);
    setVoidReason('');
  }, []);

  const handleConfirmVoid = useCallback(() => {
    if (!voidTarget) return;

    voidRFQ(
      { id: voidTarget.id, cancellationReason: voidReason },
      {
        onSuccess: handleCloseVoid,
      }
    );
  }, [handleCloseVoid, voidRFQ, voidReason, voidTarget]);

  return (
    <div className="container-fluid py-7.5">
      <RFQListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
      <RFQListStats stats={stats} isLoading={isStatsLoading} />

      <div className="mb-3 flex justify-end">
        <ViewSwitcher views={RFQ_VIEW_OPTIONS} active={view} onChange={setView} />
      </div>

      <Card className="overflow-hidden">
        <RFQListFilters
          trackFilter={trackFilter}
          statusFilter={statusFilter}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          tradeCategories={tradeCategories}
          statuses={statuses}
          onSearchChange={handleSearchChange}
          onUpdateParams={updateParams}
          onClearFilters={clearFilters}
        />
        {view === 'list' ? (
          <RFQListTable
            table={table}
            totalCount={totalCount}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="px-4 py-5 lg:px-7.5">
            <PipelineBoard<RFQListItem, RFQPipelineColumnKey>
              items={listData}
              columns={RFQ_PIPELINE_COLUMNS}
              groupOf={classifyRFQ}
              emptyLabel="No RFQs"
              renderCard={(rfq) => {
                const deadlineLabel = formatRFQDeadline(rfq.bidDeadline);
                return (
                  <Link
                    to={`/app/project/${projectId}/rfqs/${rfq.id}`}
                    className="block rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-all duration-100 ease-out hover:-translate-y-0.5 hover:border-zinc-400/60 hover:shadow-md hover:shadow-zinc-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-zinc-600/80 dark:bg-zinc-950/50"
                  >
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {rfq.rfqNumber ?? 'No RFQ #'}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/70">
                      {rfq.title}
                    </div>
                    {deadlineLabel && (
                      <div className="mt-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                        Due {deadlineLabel}
                      </div>
                    )}
                  </Link>
                );
              }}
            />
          </div>
        )}
      </Card>

      <RFQListConfirmDialogs
        deleteTarget={deleteTarget}
        voidTarget={voidTarget}
        voidReason={voidReason}
        isDeletePending={isDeletePending}
        isVoidPending={isVoidPending}
        onCloseDelete={() => setDeleteTarget(null)}
        onCloseVoid={handleCloseVoid}
        onConfirmDelete={handleConfirmDelete}
        onConfirmVoid={handleConfirmVoid}
        onVoidReasonChange={setVoidReason}
      />
    </div>
  );
}
