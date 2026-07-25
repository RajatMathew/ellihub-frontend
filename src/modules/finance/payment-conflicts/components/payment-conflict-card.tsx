import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  detectionSourceLabels,
  formatConflictDate,
  formatConflictMoney,
  formatConflictRelativeTime,
  formatDiffValue,
  resolutionActionLabels,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type { PaymentConflict } from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentConflictCardProps {
  conflict: PaymentConflict;
  canResolve: boolean;
  isRechecking: boolean;
  isAccepting: boolean;
  onRecheck: (conflictId: string) => void;
  onAccept: (conflictId: string) => void;
}

export function PaymentConflictCard({
  conflict,
  canResolve,
  isRechecking,
  isAccepting,
  onRecheck,
  onAccept,
}: PaymentConflictCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isActive = conflict.status === 'ACTIVE';
  const currency = conflict.baseline.currencyCode ?? 'USD';
  const purchaseOrderPath = `/app/project/${encodeURIComponent(
    conflict.purchaseOrder.project.id
  )}/purchase-orders/${encodeURIComponent(conflict.purchaseOrder.id)}/edit`;

  const acceptQuickBooks = () => {
    setIsConfirmOpen(false);
    onAccept(conflict.id);
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <div className="flex flex-col gap-4 border-b border-border/80 bg-muted/20 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant={conflict.severity === 'HIGH' ? 'destructive' : 'warning'}
              appearance="light"
              size="sm"
            >
              {conflict.severity === 'HIGH' ? 'High priority' : 'Review'}
            </Badge>
            {isActive ? (
              <Badge variant="warning" appearance="outline" size="sm">
                Active conflict
              </Badge>
            ) : (
              <Badge variant="success" appearance="outline" size="sm">
                <CheckCircle2 /> Resolved
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {detectionSourceLabels[conflict.detectionSource]}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              to={purchaseOrderPath}
              className="text-base font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              PO {conflict.purchaseOrder.poNumber}
            </Link>
            <span className="text-sm text-muted-foreground">
              {conflict.purchaseOrder.vendor.name}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {conflict.purchaseOrder.project.name}
            {conflict.purchaseOrder.project.jobNumber
              ? ` ? Job ${conflict.purchaseOrder.project.jobNumber}`
              : ''}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-x-7 gap-y-2 text-sm lg:text-right">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Elli payment</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatConflictMoney(conflict.payment.amount, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment date</p>
            <p className="mt-1 font-medium text-foreground">
              {formatConflictDate(conflict.payment.txnDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">What changed</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last detected {formatConflictRelativeTime(conflict.lastDetectedAt)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {conflict.diffs.length} {conflict.diffs.length === 1 ? 'difference' : 'differences'}
          </span>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {conflict.diffs.map((diff, index) => (
            <div
              key={`${diff.path}-${diff.lineId ?? index}`}
              className="grid gap-3 bg-background px-3 py-3 md:grid-cols-[minmax(9rem,0.75fr)_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:px-4"
            >
              <div className="flex items-center gap-2">
                {diff.severity === 'HIGH' && (
                  <AlertTriangle className="size-3.5 text-destructive" />
                )}
                <span className="text-xs font-medium text-foreground">{diff.label}</span>
              </div>
              <div className="min-w-0 rounded-sm bg-muted/60 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Elli
                </p>
                <p
                  className="mt-0.5 truncate text-sm font-medium text-foreground"
                  title={formatDiffValue(conflict, diff, 'elli')}
                >
                  {formatDiffValue(conflict, diff, 'elli')}
                </p>
              </div>
              <ArrowRight className="hidden size-4 text-muted-foreground md:block" />
              <div className="min-w-0 rounded-sm border border-primary/15 bg-primary/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  QuickBooks
                </p>
                <p
                  className="mt-0.5 truncate text-sm font-medium text-foreground"
                  title={formatDiffValue(conflict, diff, 'quickbooks')}
                >
                  {formatDiffValue(conflict, diff, 'quickbooks')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {isActive && conflict.acceptBlockedReasons.length > 0 && (
          <div className="mt-3 flex gap-2 rounded-md border border-warning-alpha bg-warning-soft px-3 py-2.5 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="font-semibold">QuickBooks values cannot be accepted automatically</p>
              <p className="mt-0.5 opacity-90">{conflict.acceptBlockedReasons.join(' ')}</p>
            </div>
          </div>
        )}

        {!isActive && conflict.resolutionAction && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-success-alpha bg-success-soft px-3 py-2.5 text-xs text-success-soft-foreground">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="font-semibold">{resolutionActionLabels[conflict.resolutionAction]}</p>
              <p className="mt-0.5 opacity-90">
                {conflict.resolutionNote ?? 'The payment conflict was resolved.'}
                {conflict.resolvedBy ? ` By ${conflict.resolvedBy.name}.` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="truncate text-xs text-muted-foreground">
          QuickBooks transaction {conflict.payment.transactionId}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={conflict.payment.transactionUrl} target="_blank" rel="noreferrer">
              Open in QuickBooks <ExternalLink />
            </a>
          </Button>

          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!canResolve || isRechecking || isAccepting}
                onClick={() => onRecheck(conflict.id)}
              >
                {isRechecking ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Recheck
              </Button>

              <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={
                      !canResolve || !conflict.canAcceptQuickBooks || isRechecking || isAccepting
                    }
                  >
                    {isAccepting && <Loader2 className="animate-spin" />}
                    Use QuickBooks values
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Use the current QuickBooks values?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Elli will update this payment&apos;s vendor, bank account, date, categories,
                      and amounts to match the latest QuickBooks transaction. This action is logged.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={acceptQuickBooks}>
                      Use QuickBooks values
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
