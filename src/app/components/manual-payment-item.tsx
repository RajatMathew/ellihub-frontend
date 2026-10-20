import type { ReactNode } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import { HandCoins } from 'lucide-react';

interface ManualPaymentItemProps {
  amount?: number;
  txnDate?: string | null;
  /** The check, wire or confirmation number, as it was typed. */
  reference?: string | null;
  memo?: string | null;
  bankAccountName?: string | null;
  recordedByName?: string | null;
  /** A control for the payment, such as deleting it, where the page allows. */
  action?: ReactNode;
}

/**
 * A payment recorded by hand in Monthly Bills: paid outside QuickBooks, by
 * check, wire or card. There is no QuickBooks transaction to open, so it shows
 * what was recorded instead.
 */
export function ManualPaymentItem({
  amount,
  txnDate,
  reference,
  memo,
  bankAccountName,
  recordedByName,
  action,
}: ManualPaymentItemProps) {
  return (
    <div className="rounded-lg border border-card-border bg-card p-3 transition-colors hover:bg-surface-hover sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-card-border bg-muted text-muted-foreground">
          <HandCoins className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {amount === undefined ? 'Amount unavailable' : formatCurrency(amount)}
            </p>
            <Badge variant="secondary" appearance="light" size="sm">
              Manual
            </Badge>
          </div>
          <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{txnDate ? `Paid ${formatDateOnly(txnDate)}` : 'Payment date unavailable'}</span>
            <span className="min-w-0 break-words text-foreground">
              {reference || 'No reference recorded'}
            </span>
            {bankAccountName ? <span>Bank account: {bankAccountName}</span> : null}
            {memo ? <span className="min-w-0 break-words">{memo}</span> : null}
            {recordedByName ? <span>Recorded by {recordedByName}</span> : null}
          </div>
        </div>

        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
