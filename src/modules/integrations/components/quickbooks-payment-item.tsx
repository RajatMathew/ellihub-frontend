import { Button } from '@/app/components/ui/button';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { CreditCard, ExternalLink } from 'lucide-react';

interface QuickBooksPaymentItemProps {
  amount?: number;
  txnDate?: string | null;
  checkNumber?: string | null;
  transactionUrl?: string | null;
}

export function QuickBooksPaymentItem({
  amount,
  txnDate,
  checkNumber,
  transactionUrl,
}: QuickBooksPaymentItemProps) {
  return (
    <div className="@container rounded-lg border border-card-border bg-card p-3 transition-colors hover:bg-surface-hover sm:p-4">
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-card-border bg-muted text-muted-foreground">
            <CreditCard className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {amount === undefined ? 'Amount unavailable' : formatCurrency(amount)}
            </p>
            <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
              <span>{txnDate ? `Paid ${formatDate(txnDate)}` : 'Payment date unavailable'}</span>
              <span className="min-w-0 break-all">
                {checkNumber ? `Check no. ${checkNumber}` : 'Check number pending'}
              </span>
            </div>
          </div>
        </div>

        {transactionUrl ? (
          <Button variant="outline" size="sm" className="w-full @lg:w-auto" asChild>
            <a href={transactionUrl} target="_blank" rel="noopener noreferrer">
              Open QuickBooks transaction
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full @lg:w-auto" disabled>
            QuickBooks link unavailable
            <ExternalLink aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
