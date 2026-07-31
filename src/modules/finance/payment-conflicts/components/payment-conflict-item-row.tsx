import { Badge, BadgeDot } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import {
  formatConflictTimestamp,
  formatDiffValue,
  resolutionActionLabels,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentConflictItem,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { CheckCircle2, Clock3, ExternalLink, Loader2 } from 'lucide-react';

interface PaymentConflictItemRowProps {
  conflict: PaymentConflict;
  quickBooksTransactionUrl: string;
  item: PaymentConflictItem;
  canResolve: boolean;
  isAccepting: boolean;
  onAccept: (item: PaymentConflictItem) => void;
}

export function PaymentConflictItemRow({
  conflict,
  quickBooksTransactionUrl,
  item,
  canResolve,
  isAccepting,
  onAccept,
}: PaymentConflictItemRowProps) {
  const isActive = item.status === 'ACTIVE';
  const blockedReason = item.acceptBlockedReasons[0];
  const elliValue = formatDiffValue(conflict, item, 'elli');
  const quickBooksValue = formatDiffValue(conflict, item, 'quickbooks');

  return (
    <article className="rounded-lg border border-border bg-muted/20 p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
        <Badge
          variant={item.priority === 'HIGH' ? 'destructive' : 'warning'}
          appearance="outline"
          size="sm"
          shape="circle"
          className="font-normal"
        >
          <BadgeDot />
          {item.priority === 'HIGH' ? 'High' : 'Review'}
        </Badge>
      </header>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-0">
        <div className="min-w-0 sm:pr-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Elli
          </p>
          <p
            className={cn(
              'mt-2 break-words text-sm',
              isActive ? 'text-muted-foreground line-through decoration-border' : 'text-foreground'
            )}
            title={elliValue}
          >
            {elliValue}
          </p>
        </div>
        <div className="min-w-0 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            QuickBooks
          </p>
          <p className="mt-2 break-words text-sm font-medium text-primary" title={quickBooksValue}>
            {quickBooksValue}
          </p>
        </div>
      </div>

      {isActive ? (
        <>
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Last changed in QB</span>
            <time className="font-medium text-foreground" dateTime={item.lastDetectedAt}>
              {formatConflictTimestamp(item.lastDetectedAt)}
            </time>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="w-full sm:w-auto" title={blockedReason}>
              <Button
                size="md"
                className="w-full sm:w-auto"
                disabled={!canResolve || !item.canAcceptQuickBooks || isAccepting}
                onClick={() => onAccept(item)}
                aria-label={`Accept QuickBooks change for ${item.label}`}
              >
                {isAccepting ? <Loader2 className="animate-spin" /> : null}
                Accept QB
              </Button>
            </span>
            <Button variant="outline" size="md" className="w-full sm:w-auto" asChild>
              <a
                href={quickBooksTransactionUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.label} in QuickBooks`}
              >
                Open in QuickBooks <ExternalLink />
              </a>
            </Button>
          </div>

          {blockedReason ? (
            <p className="mt-3 text-xs text-warning-foreground">{blockedReason}</p>
          ) : null}
        </>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">
              {item.resolutionAction ? resolutionActionLabels[item.resolutionAction] : 'Resolved'}
            </p>
            <p>
              {item.resolvedBy ? `By ${item.resolvedBy.name} - ` : ''}
              {formatConflictTimestamp(item.resolvedAt ?? item.lastDetectedAt)}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
