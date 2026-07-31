import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { cn } from '@/app/lib/utils';
import {
  formatConflictMoney,
  getReferenceLabel,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentLineDetail,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { CheckCircle2, Minus } from 'lucide-react';

interface PaymentConflictLineItemsComparisonProps {
  conflict: PaymentConflict;
  isActive: boolean;
}

export function PaymentConflictLineItemsComparison({
  conflict,
  isActive,
}: PaymentConflictLineItemsComparisonProps) {
  const currency =
    conflict.latestQuickBooks?.currencyCode ?? conflict.baseline.currencyCode ?? 'USD';
  const elliLines = getDisplayLines(conflict.baseline);
  const quickBooksLines = conflict.latestQuickBooks
    ? getDisplayLines(conflict.latestQuickBooks)
    : [];

  return (
    <div className="mt-4 space-y-4">
      <LineItemsTable
        label="Elli"
        conflict={conflict}
        lines={elliLines}
        currency={currency}
        isSuperseded={isActive}
      />
      <LineItemsTable
        label="QuickBooks"
        conflict={conflict}
        lines={quickBooksLines}
        currency={currency}
      />
    </div>
  );
}

function LineItemsTable({
  label,
  conflict,
  lines,
  currency,
  isSuperseded = false,
}: {
  label: string;
  conflict: PaymentConflict;
  lines: PaymentLineDetail[];
  currency: string;
  isSuperseded?: boolean;
}) {
  return (
    <section aria-label={`${label} line items`}>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <Table className="min-w-2xl">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-9 px-3 text-xs">Category / Item</TableHead>
              <TableHead className="h-9 px-3 text-xs">Description</TableHead>
              <TableHead className="h-9 px-3 text-right text-xs">Amount</TableHead>
              <TableHead className="h-9 px-3 text-xs">Billable</TableHead>
              <TableHead className="h-9 px-3 text-xs">Customer / Project</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length > 0 ? (
              lines.map((line, index) => (
                <TableRow
                  key={line.lineId ?? `${line.detailType ?? 'line'}-${index}`}
                  className={cn(
                    isSuperseded &&
                      'text-muted-foreground [&_td]:line-through [&_td]:decoration-border'
                  )}
                >
                  <TableCell className="px-3 py-2.5 text-xs font-medium">
                    {getLineReferenceLabel(conflict, line)}
                  </TableCell>
                  <TableCell className="max-w-56 px-3 py-2.5 text-xs">
                    <span className="block truncate" title={line.description ?? undefined}>
                      {line.description ?? 'Not set'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums">
                    {formatConflictMoney(line.amount, currency)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-xs">
                    <BillableStatus status={line.billableStatus} />
                  </TableCell>
                  <TableCell className="max-w-48 px-3 py-2.5 text-xs">
                    <span
                      className="block truncate"
                      title={line.customerName ?? line.customerId ?? undefined}
                    >
                      {line.customerName ?? line.customerId ?? 'Not set'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  No line-item details available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function BillableStatus({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Minus className="size-3.5" aria-hidden="true" />
        <span>Not set</span>
      </span>
    );
  }

  const isBillable = status.toLowerCase() === 'billable';
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2
        className={cn('size-3.5', isBillable ? 'text-success' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      <span>{isBillable ? 'Yes' : 'No'}</span>
    </span>
  );
}

function getLineReferenceLabel(conflict: PaymentConflict, line: PaymentLineDetail) {
  if (line.itemId || line.itemName) {
    return `Item: ${line.itemName ?? line.itemId ?? 'Unknown'}`;
  }

  return (
    line.categoryAccountName ??
    getReferenceLabel(conflict, line.categoryAccountId) ??
    line.categoryAccountId ??
    'Not set'
  );
}

function getDisplayLines(snapshot: PaymentConflict['baseline']): PaymentLineDetail[] {
  if (snapshot.lineDetails.length > 0) return snapshot.lineDetails;

  return snapshot.lines.map((line) => ({
    ...line,
    detailType: 'AccountBasedExpenseLineDetail',
    categoryAccountName: null,
    itemId: null,
    itemName: null,
    description: null,
    billableStatus: null,
    customerId: null,
    customerName: null,
  }));
}
