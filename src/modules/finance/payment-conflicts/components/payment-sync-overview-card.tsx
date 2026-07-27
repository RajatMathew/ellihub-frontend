import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { formatConflictRelativeTime } from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type { PaymentConflictSyncStatusResponse } from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Landmark,
  Loader2,
  TriangleAlert,
} from 'lucide-react';

interface PaymentSyncOverviewCardProps {
  status: PaymentConflictSyncStatusResponse | undefined;
  companyName: string;
  activeCount: number;
  resolvedCount: number;
  isRefreshing: boolean;
  isStatusLoading: boolean;
  hasStatusError: boolean;
}

const phaseLabels: Record<string, string> = {
  QUEUED: 'Waiting to check QuickBooks',
  RECOVERING: 'Recovering an interrupted check',
  ACQUIRING_LOCK: 'Preparing the QuickBooks check',
  WAITING_FOR_LOCK: 'Waiting for another QuickBooks payment operation',
  AUTHENTICATING: 'Connecting securely to QuickBooks',
  BOOTSTRAPPING: 'Preparing existing Elli payments',
  FULL_RECONCILIATION: 'Checking all tracked payments',
  CDC: 'Checking recent QuickBooks changes',
  FINALIZING: 'Saving the check results',
};

function getStatusPresentation(
  status: PaymentConflictSyncStatusResponse | undefined,
  isStatusLoading: boolean
) {
  if (isStatusLoading) {
    return {
      label: 'Loading',
      variant: 'secondary' as const,
      icon: Loader2,
      title: 'Loading QuickBooks check status',
    };
  }
  const run = status?.run;
  if (!run) {
    if (status?.lastCompletedAt) {
      return {
        label: 'Checked',
        variant: 'secondary' as const,
        icon: CheckCircle2,
        title: `Last completed ${formatConflictRelativeTime(status.lastCompletedAt)}`,
      };
    }
    return {
      label: 'Not checked',
      variant: 'secondary' as const,
      icon: CircleDashed,
      title: 'Payment reconciliation has not run yet',
    };
  }
  if (status.isActive) {
    return {
      label: run.status === 'QUEUED' ? 'Queued' : 'Checking',
      variant: 'info' as const,
      icon: run.status === 'QUEUED' ? Clock3 : Loader2,
      title: phaseLabels[run.phase ?? ''] ?? 'Checking QuickBooks payments',
    };
  }
  if (run.status === 'SUCCESS') {
    return {
      label: 'Up to date',
      variant: 'success' as const,
      icon: CheckCircle2,
      title: run.finishedAt
        ? `Last completed ${formatConflictRelativeTime(run.finishedAt)}`
        : 'QuickBooks check completed',
    };
  }
  if (run.status === 'PARTIAL') {
    return {
      label: 'Warnings',
      variant: 'warning' as const,
      icon: TriangleAlert,
      title: 'QuickBooks check completed with warnings',
    };
  }
  return {
    label: run.status === 'INTERRUPTED' ? 'Interrupted' : 'Failed',
    variant: 'destructive' as const,
    icon: AlertCircle,
    title:
      run.status === 'INTERRUPTED'
        ? 'The previous QuickBooks check was interrupted'
        : 'The last QuickBooks check failed',
  };
}

export function PaymentSyncOverviewCard({
  status,
  companyName,
  activeCount,
  resolvedCount,
  isRefreshing,
  isStatusLoading,
  hasStatusError,
}: PaymentSyncOverviewCardProps) {
  const run = status?.run;
  const presentation = getStatusPresentation(status, isStatusLoading);
  const StatusIcon = presentation.icon;
  const progressTotal = run?.progress.total ?? null;
  const progressCompleted = run?.progress.completed ?? 0;
  const showDeterminateProgress = status?.isActive && progressTotal != null && progressTotal > 0;
  const progressValue = progressTotal
    ? Math.min(100, (progressCompleted / progressTotal) * 100)
    : 0;

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Landmark className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
                <Badge variant={presentation.variant} appearance="light" size="sm">
                  <StatusIcon
                    className={
                      isStatusLoading || (status?.isActive && run?.status === 'RUNNING')
                        ? 'animate-spin'
                        : ''
                    }
                  />
                  {presentation.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{presentation.title}</p>
              {status?.isActive && run?.startedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Started {formatConflictRelativeTime(run.startedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" />
              {activeCount} active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              {resolvedCount} resolved
            </span>
            {isRefreshing && !status?.isActive && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" /> Refreshing
              </span>
            )}
          </div>
        </div>

        {status?.isActive && run && (
          <div className="mt-4 border-t border-border pt-3">
            {showDeterminateProgress ? (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{phaseLabels[run.phase ?? ''] ?? 'Processing payments'}</span>
                  <span>
                    {progressCompleted} of {progressTotal}
                  </span>
                </div>
                <Progress value={progressValue} aria-label="QuickBooks check progress" />
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                QuickBooks is working. This page can be safely refreshed.
              </div>
            )}
          </div>
        )}

        {!status?.isActive && run?.error && (
          <div
            className={`mt-4 flex gap-2 border-t pt-3 text-xs ${
              run.status === 'PARTIAL'
                ? 'border-warning/30 text-warning-foreground'
                : 'border-destructive/30 text-destructive'
            }`}
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{run.error.message}</p>
              {run.error.retryable && <p className="mt-1">You can safely run the check again.</p>}
            </div>
          </div>
        )}

        {hasStatusError && (
          <div className="mt-4 flex gap-2 border-t border-warning/30 pt-3 text-xs text-warning-foreground">
            <TriangleAlert className="size-4 shrink-0" />
            Live QuickBooks check status is temporarily unavailable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
