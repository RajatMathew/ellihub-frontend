import { useMemo } from 'react';

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import { Card } from '@/app/components/ui/card';
import {
  PrimeChangeOrderListFilters,
  PrimeChangeOrderListHeader,
  PrimeChangeOrderListTable,
  PrimeChangeOrderNotConnected,
  PrimeChangeOrderStatusSummary,
  usePrimeChangeOrderListColumns,
} from '@/modules/project/components/prime-change-order';
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

export function PrimeChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
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
