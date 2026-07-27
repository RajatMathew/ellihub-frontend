import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  formatConflictRelativeTime,
  formatDiffValue,
  resolutionActionLabels,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentConflictItem,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

interface PaymentConflictItemRowProps {
  conflict: PaymentConflict;
  item: PaymentConflictItem;
  canResolve: boolean;
  isAccepting: boolean;
  onAccept: (item: PaymentConflictItem) => void;
}

export function PaymentConflictItemRow({
  conflict,
  item,
  canResolve,
  isAccepting,
  onAccept,
}: PaymentConflictItemRowProps) {
  const isActive = item.status === 'ACTIVE';
  const blockedReason = item.acceptBlockedReasons[0];

  return (
    <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1.6fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{item.label}</p>
          <Badge
            variant={item.priority === 'HIGH' ? 'destructive' : 'secondary'}
            appearance="light"
            size="xs"
          >
            {item.priority === 'HIGH' ? 'High' : 'Review'}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isActive
            ? `Detected ${formatConflictRelativeTime(item.lastDetectedAt)}`
            : `Resolved ${formatConflictRelativeTime(item.resolvedAt ?? item.lastDetectedAt)}`}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0 border-l-2 border-border pl-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Elli
          </p>
          <p
            className="mt-0.5 truncate text-sm text-foreground"
            title={formatDiffValue(conflict, item, 'elli')}
          >
            {formatDiffValue(conflict, item, 'elli')}
          </p>
        </div>
        <div className="min-w-0 border-l-2 border-primary/40 pl-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">QuickBooks</p>
          <p
            className="mt-0.5 truncate text-sm text-foreground"
            title={formatDiffValue(conflict, item, 'quickbooks')}
          >
            {formatDiffValue(conflict, item, 'quickbooks')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isActive ? (
          <>
            <span title={blockedReason}>
              <Button
                variant="outline"
                size="sm"
                disabled={!canResolve || !item.canAcceptQuickBooks || isAccepting}
                onClick={() => onAccept(item)}
                aria-label={`Accept QuickBooks change for ${item.label}`}
              >
                {isAccepting ? <Loader2 className="animate-spin" /> : <Check />}
                Accept
              </Button>
            </span>
            <Button variant="ghost" size="sm" asChild>
              <a
                href={conflict.payment.transactionUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Fix ${item.label} in QuickBooks`}
              >
                Fix in QuickBooks <ExternalLink />
              </a>
            </Button>
          </>
        ) : (
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {item.resolutionAction ? resolutionActionLabels[item.resolutionAction] : 'Resolved'}
            </p>
            {item.resolvedBy && <p>By {item.resolvedBy.name}</p>}
          </div>
        )}
      </div>

      {isActive && blockedReason && (
        <p className="text-xs text-warning-foreground lg:col-start-2 lg:col-span-2">
          {blockedReason}
        </p>
      )}
    </div>
  );
}
