import { useCallback, useMemo, useState } from 'react';

import { useAccess } from '@/app/contexts/access-context';
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
import type { ListPTOParams } from '@/modules/hr/schemas/pto.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

export default function PTOListPage() {
  const { can } = useAccess();
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

  const ptoQuery = usePTOListQuery(filters);
  const statsQuery = usePTOStatsQuery();
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();
  const hasListData = ptoQuery.data !== undefined;
  const hasStatsData = statsQuery.data !== undefined;
  const showListInitialLoader = ptoQuery.isLoading || (ptoQuery.isFetching && !hasListData);
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const isRefreshingList = hasListData && ptoQuery.isFetching && !showListInitialLoader;
  const listData = ptoQuery.data?.data ?? [];
  const totalCount = ptoQuery.data?.pagination.totalItems ?? 0;
  const canReviewPTO = can('leave', 'approve');
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const columns = usePTOListColumns({
    isDecisionPending: approveMutation.isPending || rejectMutation.isPending,
    canReview: canReviewPTO,
    onDelete: useCallback((request) => setDeleteTarget(request), []),
    onDecision: useCallback(
      (target) => {
        if (!canReviewPTO) return;
        setDecisionTarget(target);
      },
      [canReviewPTO]
    ),
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
      if (!canReviewPTO) return;
      const mutation = target.type === 'approve' ? approveMutation : rejectMutation;
      await mutation.mutateAsync({ id: target.id, note });
    },
    [approveMutation, canReviewPTO, rejectMutation]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteMutation, deleteTarget]);

  return (
    <div className="container-fluid py-7.5">
      <PTOListToolbar
        totalCount={totalCount}
        searchQuery={searchQuery}
        isLoading={showListInitialLoader}
      />
      <PTOListStats stats={statsQuery.data} isLoading={showStatsInitialLoader} />

      <div className="pt-5">
        <PTOTableCard
          table={table}
          totalCount={totalCount}
          isLoading={showListInitialLoader}
          isRefreshing={isRefreshingList}
          isError={ptoQuery.isError}
          isRefetching={isRefreshingList}
          searchInput={searchInput}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onClearSearch={clearSearch}
          onRetry={() => void ptoQuery.refetch()}
        />
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

      {canReviewPTO && (
        <PTODecisionDialog
          target={decisionTarget}
          isPending={approveMutation.isPending || rejectMutation.isPending}
          onClose={() => setDecisionTarget(null)}
          onConfirm={handleDecision}
        />
      )}
    </div>
  );
}
