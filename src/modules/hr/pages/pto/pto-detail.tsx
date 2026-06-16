import { useCallback, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  PTODecisionCard,
  PTODetailLoading,
  PTODetailToolbar,
  PTOEmployeeCard,
  PTOHistoryCard,
  PTORequestInfoCard,
} from '@/modules/hr/components/pto/detail';
import {
  getPTOEmployeeName,
  getPTOTypeLabel,
  PTODeleteDialog,
} from '@/modules/hr/components/pto/shared';
import {
  useApprovePTOMutation,
  useDeletePTOMutation,
  usePTODetailQuery,
  useRejectPTOMutation,
} from '@/modules/hr/hooks/pto.hooks';
import { useNavigate, useParams } from 'react-router-dom';

export default function PTODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ptoQuery = usePTODetailQuery(id ?? '');
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const ptoBreadcrumbLabel = ptoQuery.data
    ? `${getPTOEmployeeName(ptoQuery.data)} - ${getPTOTypeLabel(ptoQuery.data)}`
    : undefined;

  useBreadcrumbLabel(
    id ? `/app/hr/pto/${id}` : undefined,
    ptoBreadcrumbLabel ?? 'PTO Request'
  );

  const handleDecision = useCallback(
    (type: 'approve' | 'reject', note: string) => {
      if (!ptoQuery.data) return;

      const mutation = type === 'approve' ? approveMutation : rejectMutation;
      mutation.mutate({ id: ptoQuery.data.id, note });
    },
    [approveMutation, ptoQuery.data, rejectMutation]
  );

  const handleDelete = useCallback(() => {
    if (!ptoQuery.data) return;

    deleteMutation.mutate(ptoQuery.data.id, {
      onSuccess: () => navigate('..'),
    });
  }, [deleteMutation, navigate, ptoQuery.data]);

  if (ptoQuery.isLoading) {
    return <PTODetailLoading />;
  }

  if (ptoQuery.isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState title="Unable to load request." onRetry={() => void ptoQuery.refetch()} />
      </div>
    );
  }

  if (!ptoQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <p className="text-sm font-medium text-muted-foreground">Request not found.</p>
        </div>
      </div>
    );
  }

  const pto = ptoQuery.data;
  const isPending = pto.status === 'PENDING';
  const isDecisionPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container-fluid max-w-full overflow-x-hidden pb-5">
      <PTODetailToolbar pto={pto} onDelete={() => setDeleteOpen(true)} />

      <div className="grid min-w-0 grid-cols-1 gap-6 pt-6 lg:grid-cols-4">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <PTORequestInfoCard pto={pto} />
          {isPending && (
            <PTODecisionCard isPending={isDecisionPending} onDecision={handleDecision} />
          )}
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-1">
          <PTOEmployeeCard pto={pto} />
          <PTOHistoryCard pto={pto} />
        </div>
      </div>

      <PTODeleteDialog
        open={deleteOpen}
        name={getPTOEmployeeName(pto)}
        isPending={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
