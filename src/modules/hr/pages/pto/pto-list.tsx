import { useCallback, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { useAccess } from '@/app/contexts/access-context';
import { PTOListStats, PTOListToolbar, usePTOListColumns } from '@/modules/hr/components/pto/list';
import {
  PTODecisionDialog,
  PTODeleteDialog,
  type PTODecisionTarget,
} from '@/modules/hr/components/pto/shared';
import {
  PTO_DEFAULT_PAGE_SIZE,
  PTO_SORT_FIELDS,
} from '@/modules/hr/constants/pto/pto-list.constants';
import {
  useApprovePTOMutation,
  useDeletePTOMutation,
  usePTOListQuery,
  usePTOStatsQuery,
  useRejectPTOMutation,
} from '@/modules/hr/hooks/pto.hooks';
import type { ListPTOParams } from '@/modules/hr/schemas/pto.schema';
import { Calendar } from 'lucide-react';

const PTO_FILTERS = [f.search({ className: 'sm:w-72', placeholder: 'Search requests...' })];

interface PTODeleteTarget {
  id: string;
  name: string;
}

export default function PTOListPage() {
  const { can } = useAccess();
  const [deleteTarget, setDeleteTarget] = useState<PTODeleteTarget | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<PTODecisionTarget | null>(null);

  const state = useListState({
    filters: PTO_FILTERS,
    pageSize: PTO_DEFAULT_PAGE_SIZE,
    sort: { by: 'startDate', fields: PTO_SORT_FIELDS, order: 'desc' },
  });

  const ptoQuery = usePTOListQuery(state.apiParams as ListPTOParams);
  const statsQuery = usePTOStatsQuery();
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();

  const canReviewPTO = can('leave', 'approve');

  const columns = usePTOListColumns({
    canReview: canReviewPTO,
    isDecisionPending: approveMutation.isPending || rejectMutation.isPending,
    onDecision: useCallback(
      (target: PTODecisionTarget) => {
        if (!canReviewPTO) return;
        setDecisionTarget(target);
      },
      [canReviewPTO]
    ),
    onDelete: useCallback((request: PTODeleteTarget) => setDeleteTarget(request), []),
  });

  const list = useListTable({
    columns,
    getRowId: (request) => request.id,
    query: ptoQuery,
    rows: ptoQuery.data?.data ?? [],
    state,
    totalCount: ptoQuery.data?.pagination.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

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
        isLoading={list.isInitialLoading}
        searchQuery={state.values.search ?? ''}
        totalCount={list.totalCount}
      />
      <PTOListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <div className="pt-5">
        <DataTable
          ariaLabel="PTO requests"
          empty={{
            description: 'Submit a new time off request to start tracking staff leave.',
            icon: <Calendar className="size-10 text-muted-foreground/40" />,
            title: 'No requests found',
          }}
          error={{ title: 'Failed to load time off requests.' }}
          list={list}
          state={state}
          title={
            <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
              All PTO Requests
            </span>
          }
        />
      </div>

      <PTODeleteDialog
        isPending={deleteMutation.isPending}
        name={deleteTarget?.name}
        open={Boolean(deleteTarget)}
        onConfirm={handleConfirmDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />

      {canReviewPTO && (
        <PTODecisionDialog
          isPending={approveMutation.isPending || rejectMutation.isPending}
          target={decisionTarget}
          onClose={() => setDecisionTarget(null)}
          onConfirm={handleDecision}
        />
      )}
    </div>
  );
}
