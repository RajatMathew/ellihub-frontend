import { useCallback, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { PTOListStats, PTOListToolbar, usePTOListColumns } from '@/modules/hr/components/pto/list';
import {
  getPTOEmployeeName,
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
  useBulkDeletePTOMutation,
  useDeletePTOMutation,
  usePTOListQuery,
  usePTOStatsQuery,
  useRejectPTOMutation,
} from '@/modules/hr/hooks/pto.hooks';
import type { ListPTOParams, PTO } from '@/modules/hr/schemas/pto.schema';
import { Calendar, Trash2 } from 'lucide-react';

const PTO_FILTERS = [f.search({ className: 'sm:w-72', placeholder: 'Search requests...' })];

interface PTODeleteTarget {
  id: string;
  name: string;
}

const PTO_ITEM_LABEL = { many: 'PTO requests', one: 'PTO request' };

// Module scope, so the selection config keeps one identity for the table's life.
const PTO_SELECTION: ListSelectionConfig<PTO> = {
  getRowLabel: getPTOEmployeeName,
};

export default function PTOListPage() {
  const { can } = useAccess();
  const [deleteTarget, setDeleteTarget] = useState<PTODeleteTarget | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<PTODecisionTarget | null>(null);
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const canDeletePTO = can('leave', 'create');

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
    canDelete: canDeletePTO,
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
    selection: canDeletePTO ? PTO_SELECTION : undefined,
    state,
    totalCount: ptoQuery.data?.pagination.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeletePTOMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
          bulkItemLabel={PTO_ITEM_LABEL}
          bulkActions={
            <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
          }
          empty={{
            description: 'Submit a new time off request to start tracking staff leave.',
            icon: Calendar,
            title: 'No requests found',
          }}
          error={{ title: 'Failed to load time off requests.' }}
          list={list}
          state={state}
          title="All PTO Requests"
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

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={PTO_ITEM_LABEL}
        items={list.selection.items}
        open={isBulkDeleteOpen}
        onConfirm={() => bulkDelete.run(list.selection.ids)}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) bulkDelete.reset();
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
