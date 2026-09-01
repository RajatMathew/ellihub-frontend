import { useCallback } from 'react';

import { ListPageHeader } from '@/app/components/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAccess } from '@/app/contexts/access-context';
import { PaymentConflictsList } from '@/modules/finance/payment-conflicts/components/payment-conflicts-list';
import { PaymentSyncOverviewCard } from '@/modules/finance/payment-conflicts/components/payment-sync-overview-card';
import {
  useAcceptQuickBooksPaymentMutation,
  usePaymentConflictsQuery,
  usePaymentConflictSyncStatusQuery,
  useRecheckPaymentConflictMutation,
  useSyncPaymentConflictsMutation,
} from '@/modules/finance/payment-conflicts/hooks/payment-conflicts.hooks';
import type { PaymentConflictStatus } from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { ChevronLeft, ChevronRight, Landmark, Loader2, RefreshCcw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 10;

function getPositivePage(searchParams: URLSearchParams) {
  const value = Number(searchParams.get('page'));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export default function PaymentConflictsPage() {
  const { can } = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'resolved' ? 'resolved' : 'active';
  const status: PaymentConflictStatus = tab === 'resolved' ? 'RESOLVED' : 'ACTIVE';
  const page = getPositivePage(searchParams);

  const updateParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const conflictsQuery = usePaymentConflictsQuery({ status, page, size: PAGE_SIZE });
  const syncStatusQuery = usePaymentConflictSyncStatusQuery();
  const recheckMutation = useRecheckPaymentConflictMutation();
  const acceptMutation = useAcceptQuickBooksPaymentMutation();
  const syncMutation = useSyncPaymentConflictsMutation();
  const response = conflictsQuery.data;
  const conflicts = response?.data ?? [];
  const activeCount = response?.counts.active ?? 0;
  const totalPages = Math.max(1, Math.ceil((response?.count ?? 0) / PAGE_SIZE));
  const canResolve = can('quickBooksPaymentConflict', 'resolve');
  const canSync = can('quickBooksPaymentConflict', 'sync');
  const isTabLoading = conflictsQuery.isLoading || conflictsQuery.isPlaceholderData;
  const syncStatus = syncStatusQuery.data;
  const syncRun = syncStatus?.run;
  const isSyncActive = Boolean(syncStatus?.isActive || syncMutation.isPending);
  const hasSyncProblem =
    syncStatusQuery.isError ||
    syncRun?.status === 'FAILED' ||
    syncRun?.status === 'INTERRUPTED' ||
    syncRun?.status === 'PARTIAL';
  const showSyncOverview = isSyncActive || hasSyncProblem;
  const syncButtonLabel = isSyncActive
    ? syncRun?.status === 'QUEUED'
      ? 'Waiting to check...'
      : 'Checking QuickBooks...'
    : syncRun?.status === 'FAILED' || syncRun?.status === 'INTERRUPTED'
      ? 'Retry QuickBooks check'
      : 'Check QuickBooks now';

  return (
    <div className="container-fluid py-7.5">
      {/* The header spans the page like every other one; the conflict cards keep
          their narrow measure below it. */}
      <ListPageHeader
        title="QB Sync Conflicts"
        description={
          <span className="text-sm text-muted-foreground">
            {activeCount} {activeCount === 1 ? 'conflict needs' : 'conflicts need'} review
          </span>
        }
        actions={[
          {
            label: syncButtonLabel,
            icon: isSyncActive ? Loader2 : RefreshCcw,
            pending: isSyncActive,
            disabled: isSyncActive || !response?.connection,
            enabled: canSync,
            onClick: () => syncMutation.mutate(),
          },
        ]}
      />

      <div className="mx-auto w-full max-w-3xl pt-6 sm:px-6">
        {!conflictsQuery.isLoading && response?.connection === null ? (
          <QuickBooksDisconnectedState />
        ) : (
          <>
            {showSyncOverview ? (
              <PaymentSyncOverviewCard
                status={syncStatus}
                companyName={response?.connection?.companyName ?? 'QuickBooks company'}
                activeCount={activeCount}
                resolvedCount={response?.counts.resolved ?? 0}
                isRefreshing={conflictsQuery.isFetching && !conflictsQuery.isLoading}
                hasStatusError={syncStatusQuery.isError}
                isStatusLoading={syncStatusQuery.isLoading}
              />
            ) : null}

            <Tabs
              value={tab}
              className="mb-6"
              onValueChange={(value) => updateParams({ tab: value, page: 1 })}
            >
              <TabsList variant="line" className="w-full justify-start gap-4">
                <TabsTrigger value="active">
                  Active conflicts
                  <Badge variant="destructive" appearance="outline" size="sm" shape="circle">
                    {activeCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>

            <PaymentConflictsList
              conflicts={conflicts}
              status={status}
              isLoading={isTabLoading}
              isError={conflictsQuery.isError}
              canResolve={
                canResolve &&
                !isSyncActive &&
                !recheckMutation.isPending &&
                !acceptMutation.isPending
              }
              recheckingId={recheckMutation.isPending ? recheckMutation.variables : null}
              acceptingConflictId={
                acceptMutation.isPending ? acceptMutation.variables.conflictId : null
              }
              acceptingItemIds={
                acceptMutation.isPending
                  ? acceptMutation.variables.items.map((item) => item.id)
                  : []
              }
              onRetry={() => void conflictsQuery.refetch()}
              onRecheck={(conflictId) => recheckMutation.mutate(conflictId)}
              onAccept={(conflictId, items) => acceptMutation.mutate({ conflictId, items })}
            />

            {!isTabLoading && !conflictsQuery.isError && (response?.count ?? 0) > 0 ? (
              <nav
                className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                aria-label="Payment conflicts pagination"
              >
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
                  {Math.min(page * PAGE_SIZE, response?.count ?? 0)} of {response?.count ?? 0}
                </p>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: page - 1 })}
                  >
                    <ChevronLeft /> Previous
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => updateParams({ page: page + 1 })}
                  >
                    Next <ChevronRight />
                  </Button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function QuickBooksDisconnectedState() {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Landmark className="size-6 text-muted-foreground" />
        </span>
        <h2 className="text-base font-semibold text-foreground">QuickBooks is not connected</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Connect a QuickBooks company before checking Elli payments for external changes.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/app/settings/integrations">Open integration settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
