import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { roundMoneyDecimal } from '@/modules/project/lib/commercial-decimal';
import type { ProjectBudgetSummary } from '@/modules/project/schemas/project.schema';
import { AlertTriangle, RotateCcw, WalletCards } from 'lucide-react';

interface PurchaseOrderBudgetImpactProps {
  summary?: ProjectBudgetSummary;
  liveTotal: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function BudgetValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold tabular-nums">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

export function PurchaseOrderBudgetImpact({
  summary,
  liveTotal,
  isLoading,
  isError,
  onRetry,
}: PurchaseOrderBudgetImpactProps) {
  if (isLoading) {
    return (
      <div
        className="space-y-4 rounded-lg border bg-muted/20 p-4"
        aria-label="Loading budget impact"
      >
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <div className="text-sm font-semibold">Budget information is unavailable</div>
          <p className="mt-1 text-xs text-muted-foreground">
            You can continue editing, but the projected project balance cannot be shown.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (!summary.budgetConfigured) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <WalletCards className="size-4 text-muted-foreground" aria-hidden="true" />
          Project Budget Impact
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A project budget is not configured yet. Set a contract value and target budget to see the
          live remaining balance.
        </p>
      </div>
    );
  }

  const currentCommittedAmount = summary.existingPurchaseOrder?.committedAmount ?? 0;
  const budgetImpact = roundMoneyDecimal(liveTotal).minus(currentCommittedAmount).toNumber();
  const projectedRemaining = roundMoneyDecimal(summary.remainingBudget)
    .minus(budgetImpact)
    .toNumber();
  const projectedCommitted = roundMoneyDecimal(summary.committedTotal)
    .plus(budgetImpact)
    .toNumber();
  const projectedUtilization =
    summary.budgetLimit > 0 ? (projectedCommitted / summary.budgetLimit) * 100 : 0;
  const isOverBudget = projectedRemaining < 0;
  const isNearBudget = !isOverBudget && projectedUtilization > 90;
  const progressColor = isOverBudget
    ? 'bg-destructive'
    : projectedUtilization > 70
      ? 'bg-warning'
      : 'bg-success';
  const isUncommittedPO =
    !summary.existingPurchaseOrder ||
    ['DRAFT', 'CANCELLED'].includes(summary.existingPurchaseOrder.status);

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isOverBudget
          ? 'border-destructive/40 bg-destructive/5'
          : isNearBudget
            ? 'border-warning/40 bg-warning/5'
            : 'bg-muted/20'
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="size-4 text-primary" aria-hidden="true" />
            Project Budget Impact
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Project-wide committed budget</p>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {Math.round(projectedUtilization)}% used
        </span>
      </div>

      <Progress
        value={Math.min(Math.max(projectedUtilization, 0), 100)}
        className="mt-3 h-2"
        indicatorClassName={progressColor}
        aria-label="Projected project budget utilization"
      />

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:grid-cols-2">
        <BudgetValue label="Budget limit" value={summary.budgetLimit} />
        <BudgetValue label="Current remaining" value={summary.remainingBudget} />
        <BudgetValue label="This PO" value={liveTotal} />
        <BudgetValue label="Projected remaining" value={projectedRemaining} />
      </div>

      {isOverBudget ? (
        <div className="mt-4 flex gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            This PO would exceed the available project budget by{' '}
            <strong>{formatCurrency(Math.abs(projectedRemaining))}</strong>. This is informational
            and does not block saving.
          </span>
        </div>
      ) : isNearBudget ? (
        <div className="mt-4 flex gap-2 rounded-md bg-warning/10 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>This PO would use more than 90% of the project budget.</span>
        </div>
      ) : null}

      {summary.existingPurchaseOrder?.committedAmount ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Projection replaces this PO&apos;s current committed amount of{' '}
          {formatCurrency(summary.existingPurchaseOrder.committedAmount)}.
        </p>
      ) : isUncommittedPO ? (
        <p className="mt-3 text-xs text-muted-foreground">
          This PO affects the committed project budget when issued.
        </p>
      ) : null}
    </div>
  );
}
