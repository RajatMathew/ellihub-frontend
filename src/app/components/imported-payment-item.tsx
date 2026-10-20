import { Badge } from '@/app/components/ui/badge';
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import {
  describeImportSource,
  formatImportedValue,
  type ImportSource,
} from '@/app/lib/import-source';
import { FileSpreadsheet } from 'lucide-react';

interface ImportedPaymentItemProps {
  amount?: number;
  txnDate?: string | null;
  /** The payment reference as recorded: the workbook's CHK# cell, verbatim. */
  reference?: string | null;
  memo?: string | null;
  importSource?: ImportSource | null;
}

/**
 * A payment loaded from a legacy migration workbook.
 *
 * It was never made through QuickBooks and has no transaction there, so where
 * the QuickBooks card offers "Open QuickBooks transaction" this shows what the
 * workbook recorded - the reference as written, which may be a check, a card,
 * a wire or a material transfer - what the helper team added to it, such as
 * the payment method and bank account, and the file and row it came from.
 */
export function ImportedPaymentItem({
  amount,
  txnDate,
  reference,
  memo,
  importSource,
}: ImportedPaymentItemProps) {
  return (
    <div className="rounded-lg border border-card-border bg-card p-3 transition-colors hover:bg-surface-hover sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-card-border bg-muted text-muted-foreground">
          <FileSpreadsheet className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {amount === undefined ? 'Amount unavailable' : formatCurrency(amount)}
            </p>
            <Badge variant="info" appearance="light" size="sm">
              Imported
            </Badge>
          </div>
          <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{txnDate ? `Paid ${formatDateOnly(txnDate)}` : 'Payment date unavailable'}</span>
            <span className="min-w-0 break-words text-foreground">
              {reference ?? 'No reference recorded'}
            </span>
            {memo ? <span className="min-w-0 break-words">{memo}</span> : null}
            {importSource?.details.map((detail) => (
              <span key={detail.label} className="min-w-0 break-words">
                {detail.label}: {formatImportedValue(detail)}
              </span>
            ))}
            {importSource ? (
              <span className="min-w-0 break-words">From {describeImportSource(importSource)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
