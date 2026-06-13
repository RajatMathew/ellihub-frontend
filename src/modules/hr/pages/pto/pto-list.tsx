import { useCallback, useMemo, useState } from 'react';

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

  return (
    <div className="container-fluid py-7.5">
      <PTOListToolbar totalCount={totalCount} searchQuery={searchQuery} />
      <PTOListStats stats={stats} isLoading={isStatsLoading} />

      <div className="pt-5">
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
