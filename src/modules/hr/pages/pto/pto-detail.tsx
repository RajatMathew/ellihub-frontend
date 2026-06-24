import { useCallback, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  PTODecisionCard,
  PTODetailLoading,
  PTODetailSidebar,
  PTODetailToolbar,
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
  const { can } = useAccess();
  const ptoQuery = usePTODetailQuery(id ?? '');
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const ptoBreadcrumbLabel = ptoQuery.data
    ? `${getPTOEmployeeName(ptoQuery.data)} - ${getPTOTypeLabel(ptoQuery.data)}`
    : undefined;

  useBreadcrumbLabel(id ? `/app/hr/pto/${id}` : undefined, ptoBreadcrumbLabel ?? 'PTO Request');

  const handleDecision = useCallback(
    (type: 'approve' | 'reject', note: string) => {
      if (!can('leave', 'approve')) return;
      if (!ptoQuery.data) return;

      const mutation = type === 'approve' ? approveMutation : rejectMutation;
      mutation.mutate({ id: ptoQuery.data.id, note });
    },
    [approveMutation, can, ptoQuery.data, rejectMutation]
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
  const canReviewPTO = can('leave', 'approve');
  const isDecisionPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      <PTODetailToolbar
        pto={pto}
        sidebarOpen={sidebarOpen}
        onDelete={() => setDeleteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <Tabs defaultValue="overview" className="min-w-0">
            <TabsList variant="line" className="max-w-full overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              <PTORequestInfoCard pto={pto} />
              {canReviewPTO && isPending && (
                <PTODecisionCard isPending={isDecisionPending} onDecision={handleDecision} />
              )}
            </TabsContent>

            <TabsContent value="timeline">
              <PTOHistoryCard pto={pto} />
            </TabsContent>
          </Tabs>
        </div>

        <PTODetailSidebar pto={pto} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
