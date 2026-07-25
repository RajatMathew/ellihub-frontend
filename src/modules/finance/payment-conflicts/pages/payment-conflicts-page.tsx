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
import {
  useAcceptQuickBooksPaymentMutation,
  usePaymentConflictsQuery,
  useRecheckPaymentConflictMutation,
  useSyncPaymentConflictsMutation,
} from '@/modules/finance/payment-conflicts/hooks/payment-conflicts.hooks';
import { formatConflictDate } from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflictSeverity,
  PaymentConflictStatus,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  RefreshCcw,
  Search,
} from 'lucide-react';
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
  const recheckMutation = useRecheckPaymentConflictMutation();
  const acceptMutation = useAcceptQuickBooksPaymentMutation();
  const syncMutation = useSyncPaymentConflictsMutation();
  const response = conflictsQuery.data;
  const conflicts = (response?.data ?? []).filter((conflict) => conflict.status === status);
  const totalPages = Math.max(1, Math.ceil((response?.count ?? 0) / PAGE_SIZE));
  const canResolve = can('quickBooksPaymentConflict', 'resolve');
  const canSync = can('quickBooksPaymentConflict', 'sync');
  const isTabLoading = conflictsQuery.isLoading || conflictsQuery.isPlaceholderData;

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
                disabled={syncMutation.isPending || response?.connection === null}
              >
                {syncMutation.isPending ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Check QuickBooks now
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {!conflictsQuery.isLoading && response?.connection === null ? (
        <QuickBooksDisconnectedState />
      ) : (
        <>
          <Card className="mb-4 overflow-hidden">
            <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Landmark className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {response?.connection?.companyName ?? 'QuickBooks company'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {response?.sync?.lastCompletedAt
                      ? `Last checked ${formatConflictDate(response.sync.lastCompletedAt)}`
                      : 'Payment reconciliation has not run yet'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-destructive" />
                  {response?.counts.active ?? 0} active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success" />
                  {response?.counts.resolved ?? 0} resolved
                </span>
                {conflictsQuery.isFetching && !conflictsQuery.isLoading && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" /> Refreshing
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {response?.sync?.status === 'FAILED' && response.sync.error && (
            <div className="mb-4 flex gap-2 rounded-md border border-destructive-alpha bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">The last QuickBooks check failed</p>
                <p className="mt-0.5 text-xs">{response.sync.error}</p>
              </div>
            </div>
          )}

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
            canResolve={canResolve}
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
