import { useCallback, useMemo, useState } from 'react';

import { Card } from '@/app/components/ui/card';
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
import { useNavigate, useParams } from 'react-router-dom';

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
        <RFQListTable
          table={table}
          totalCount={totalCount}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
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
