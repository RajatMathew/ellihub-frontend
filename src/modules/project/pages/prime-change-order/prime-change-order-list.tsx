import { useMemo } from 'react';

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import { Card, CardContent } from '@/app/components/ui/card';
import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { formatCurrency } from '@/app/lib/helpers';
import {
  PrimeChangeOrderListFilters,
  PrimeChangeOrderListHeader,
  PrimeChangeOrderListTable,
  PrimeChangeOrderNotConnected,
  PrimeChangeOrderStatusSummary,
  usePrimeChangeOrderListColumns,
} from '@/modules/project/components/prime-change-order';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';
import {
  isPrimeChangeOrderSortByField,
  PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
} from '@/modules/project/constants/prime-change-order';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import {
  usePrimeChangeOrderListParams,
  usePrimeChangeOrdersQuery,
  usePrimeChangeOrderStatusSummaryQuery,
  usePrimeChangeOrderSyncStatusQuery,
  useSyncPrimeChangeOrdersMutation,
  type PrimeChangeOrderListParamPatch,
} from '@/modules/project/hooks/prime-change-order';
import type { ListPrimeChangeOrderParams } from '@/modules/project/schemas/prime-change-order';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';

type PcoPipelineKey = 'draft' | 'requested' | 'pending' | 'approved' | 'rejected';

const PCO_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<PcoPipelineKey>> = [
  { key: 'draft', label: 'Draft', accent: '#6b6359' },
  { key: 'requested', label: 'Requested', accent: '#1a3a5f' },
  { key: 'pending', label: 'Pending', accent: '#b8860b' },
  { key: 'approved', label: 'Approved', accent: '#2d6a4f' },
  { key: 'rejected', label: 'Rejected / Void', accent: '#dc2626' },
];

function classifyPco(pco: PrimeChangeOrder): PcoPipelineKey {
  const raw = (
    (pco as unknown as { status?: { name?: string; id?: string } }).status?.name ??
    (pco as unknown as { status?: { name?: string; id?: string } }).status?.id ??
    pco.statusName ??
    ''
  )
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (raw === 'pending_revision' || raw === 'pending_approval') return 'pending';
  if (raw === 'rejected' || raw === 'void') return 'rejected';
  if (raw === 'draft') return 'draft';
  if (raw === 'requested') return 'requested';
  if (raw === 'approved') return 'approved';
  return 'draft';
}

function formatPcoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function PcoPipelineCard({ pco }: { pco: PrimeChangeOrder }) {
  const identifier =
    pco.referenceNumber ??
    (pco as unknown as { number?: string }).number ??
    pco.id;
  const dueLabel = formatPcoDate(pco.dueDate);
  const totalCost = typeof pco.totalCost === 'number' ? pco.totalCost : 0;

  return (
    <Card className="rounded-sm border-zinc-300/70 bg-card shadow-none transition-all duration-100 ease-out hover:-translate-y-0.5 hover:border-zinc-400/60 hover:shadow-md hover:shadow-zinc-950/10 dark:border-zinc-600/80 dark:bg-zinc-950/50">
      <CardContent className="flex flex-col gap-1.5 p-3">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          {identifier}
        </span>
        {pco.name && (
          <span className="line-clamp-2 text-xs leading-snug text-foreground/70">
            {pco.name}
          </span>
        )}
        <div className="mt-1 flex items-end justify-between gap-2">
          <span className="truncate text-[0.625rem] font-medium text-muted-foreground">
            {dueLabel ? `Due ${dueLabel}` : ''}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(totalCost)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrimeChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [view, setView] = useViewMode<'list' | 'pipeline'>('prime-change-orders', 'list');
  const {
    page,
    size,
    searchQuery,
    statusFilter,
    totalCostMin,
    totalCostMax,
    sortBy,
    sortOrder,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = usePrimeChangeOrderListParams();

  const filters: ListPrimeChangeOrderParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    statusName: statusFilter,
    totalCostMin,
    totalCostMax,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter || !!totalCostMin || !!totalCostMax;
  const { data, isLoading, isError, refetch } = usePrimeChangeOrdersQuery(filters);
  const { data: projectDetail } = useProjectDetailQuery(projectId);
  const { data: statusSummary, isLoading: isLoadingStatusSummary } =
    usePrimeChangeOrderStatusSummaryQuery(projectId);
  const { data: syncStatus, isLoading: isLoadingSyncStatus } =
    usePrimeChangeOrderSyncStatusQuery(projectId);
  const syncMutation = useSyncPrimeChangeOrdersMutation();
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const isMapped = !!syncStatus?.fieldwireProjectId;
  const syncDisabled = !isMapped || syncMutation.isPending || isLoadingSyncStatus;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );
  const columns = usePrimeChangeOrderListColumns();
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
      const patches: PrimeChangeOrderListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE
            ? undefined
            : String(next.pageSize);
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

      const nextSortBy = isPrimeChangeOrderSortByField(column.id)
        ? column.id
        : 'fieldwireUpdatedAt';
      const nextSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: nextSortBy === 'fieldwireUpdatedAt' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'desc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <div>
        <PrimeChangeOrderListHeader
          projectId={projectId}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          isMapped={isMapped}
          fieldwireProjectName={projectDetail?.fieldwireProjectName}
          syncStatus={syncStatus}
          isSyncDisabled={syncDisabled}
          isSyncPending={syncMutation.isPending}
          onSync={() => syncMutation.mutate(projectId)}
        />

        {syncStatus?.syncStatus.lastSyncError && (
          <Alert variant="destructive" appearance="light" className="mb-5">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Last sync failed</AlertTitle>
              <AlertDescription>{syncStatus.syncStatus.lastSyncError}</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        <PrimeChangeOrderStatusSummary
          statusFilter={statusFilter}
          statusSummary={statusSummary}
          isLoading={isLoadingStatusSummary}
          onStatusChange={(statusName) =>
            updateParams({
              statusName,
              page: undefined,
            })
          }
        />

        <div className="mb-3 flex items-center justify-end">
          <ViewSwitcher
            views={[
              { key: 'list', label: 'List' },
              { key: 'pipeline', label: 'Pipeline' },
            ]}
            active={view}
            onChange={setView}
          />
        </div>

        <Card className="overflow-hidden">
          <PrimeChangeOrderListFilters
            searchInput={searchInput}
            statusFilter={statusFilter}
            totalCostMin={totalCostMin}
            totalCostMax={totalCostMax}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={handleSearchChange}
            onUpdateParams={updateParams}
            onClearFilters={clearFilters}
          />

          {!isMapped && !isLoadingSyncStatus ? (
            <PrimeChangeOrderNotConnected projectId={projectId} />
          ) : view === 'pipeline' ? (
            <div className="p-4 lg:p-6">
              <PipelineBoard<PrimeChangeOrder, PcoPipelineKey>
                items={listData}
                columns={PCO_PIPELINE_COLUMNS}
                groupOf={classifyPco}
                renderCard={(pco) => <PcoPipelineCard pco={pco} />}
                emptyLabel="No change orders"
              />
            </div>
          ) : (
            <PrimeChangeOrderListTable
              table={table}
              totalCount={totalCount}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => void refetch()}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
