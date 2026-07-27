import { useCallback, useEffect, useState } from 'react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAccess } from '@/app/contexts/access-context';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { PaymentConflictsList } from '@/modules/finance/payment-conflicts/components/payment-conflicts-list';
import { PaymentSyncOverviewCard } from '@/modules/finance/payment-conflicts/components/payment-sync-overview-card';
import {
  useAcceptQuickBooksPaymentMutation,
  usePaymentConflictsQuery,
  usePaymentConflictSyncStatusQuery,
  useRecheckPaymentConflictMutation,
  useSyncPaymentConflictsMutation,
} from '@/modules/finance/payment-conflicts/hooks/payment-conflicts.hooks';
import type {
  PaymentConflictSeverity,
  PaymentConflictStatus,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { ChevronLeft, ChevronRight, Landmark, Loader2, RefreshCcw, Search } from 'lucide-react';
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
  const severityParam = searchParams.get('severity');
  const severity: PaymentConflictSeverity | undefined =
    severityParam === 'HIGH' || severityParam === 'MEDIUM' ? severityParam : undefined;
  const page = getPositivePage(searchParams);
  const searchParam = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(searchParam);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

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

  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      updateParams({ search: debouncedSearch || null, page: 1 });
    }
  }, [debouncedSearch, searchParam, updateParams]);

  const conflictsQuery = usePaymentConflictsQuery({
    status,
    severity,
    search: debouncedSearch || undefined,
    page,
    size: PAGE_SIZE,
  });
  const syncStatusQuery = usePaymentConflictSyncStatusQuery();
  const recheckMutation = useRecheckPaymentConflictMutation();
  const acceptMutation = useAcceptQuickBooksPaymentMutation();
  const syncMutation = useSyncPaymentConflictsMutation();
  const response = conflictsQuery.data;
  const conflicts = (response?.data ?? []).filter((conflict) => conflict.status === status);
  const totalPages = Math.max(1, Math.ceil((response?.count ?? 0) / PAGE_SIZE));
  const canResolve = can('quickBooksPaymentConflict', 'resolve');
  const canSync = can('quickBooksPaymentConflict', 'sync');
  const isTabLoading = conflictsQuery.isLoading || conflictsQuery.isPlaceholderData;
  const syncStatus = syncStatusQuery.data;
  const syncRun = syncStatus?.run;
  const isSyncActive = Boolean(syncStatus?.isActive || syncMutation.isPending);
  const syncButtonLabel = isSyncActive
    ? syncRun?.status === 'QUEUED'
      ? 'Waiting to check...'
      : 'Checking QuickBooks...'
    : syncRun?.status === 'FAILED' || syncRun?.status === 'INTERRUPTED'
      ? 'Retry QuickBooks check'
      : 'Check QuickBooks now';

  return (
    <div className="container-fluid py-7.5">
      <Toolbar className="mb-5 gap-3 pt-5 pb-3">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarPageTitle>Payment Conflicts</ToolbarPageTitle>
              {(response?.counts.active ?? 0) > 0 && (
                <Badge variant="destructive" appearance="light" size="sm">
                  {response?.counts.active} active
                </Badge>
              )}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review Elli payments changed in QuickBooks, then choose which system should be the
              source of truth.
            </p>
          </ToolbarHeading>
          <ToolbarActions>
            {canSync && (
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={isSyncActive || response?.connection === null}
              >
                {isSyncActive ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                {syncButtonLabel}
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {!conflictsQuery.isLoading && response?.connection === null ? (
        <QuickBooksDisconnectedState />
      ) : (
        <>
          <PaymentSyncOverviewCard
            status={syncStatus}
            companyName={response?.connection?.companyName ?? 'QuickBooks company'}
            activeCount={response?.counts.active ?? 0}
            resolvedCount={response?.counts.resolved ?? 0}
            isRefreshing={conflictsQuery.isFetching && !conflictsQuery.isLoading}
            hasStatusError={syncStatusQuery.isError}
            isStatusLoading={syncStatusQuery.isLoading}
          />
          <div className="mb-4 border-b border-rule-strong">
            <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value, page: 1 })}>
              <TabsList variant="line" className="border-b-0">
                <TabsTrigger value="active">
                  Active conflicts
                  <Badge variant="destructive" appearance="light" size="xs" className="ms-1">
                    {response?.counts.active ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved
                  <Badge variant="secondary" appearance="light" size="xs" className="ms-1">
                    {response?.counts.resolved ?? 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search PO, vendor, project, or transaction"
                  className="pl-9"
                  aria-label="Search payment conflicts"
                />
              </div>
              <Select
                value={severity ?? 'ALL'}
                onValueChange={(value) =>
                  updateParams({ severity: value === 'ALL' ? null : value, page: 1 })
                }
              >
                <SelectTrigger className="w-full sm:w-44" aria-label="Filter by severity">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  <SelectItem value="HIGH">High priority</SelectItem>
                  <SelectItem value="MEDIUM">Review</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <PaymentConflictsList
            conflicts={conflicts}
            status={status}
            isLoading={isTabLoading}
            isError={conflictsQuery.isError}
            canResolve={canResolve && !isSyncActive}
            recheckingId={recheckMutation.isPending ? recheckMutation.variables : null}
            acceptingId={acceptMutation.isPending ? acceptMutation.variables : null}
            onRetry={() => void conflictsQuery.refetch()}
            onRecheck={(conflictId) => recheckMutation.mutate(conflictId)}
            onAccept={(conflictId) => acceptMutation.mutate(conflictId)}
          />

          {!isTabLoading && !conflictsQuery.isError && (response?.count ?? 0) > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}?
                {Math.min(page * PAGE_SIZE, response?.count ?? 0)} of {response?.count ?? 0}
              </p>
              <div className="flex items-center gap-2">
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
            </div>
          )}
        </>
      )}
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
