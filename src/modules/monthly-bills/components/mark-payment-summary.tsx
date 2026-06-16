import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';

interface MarkPaymentSummaryProps {
  amount: number;
  vendorName: string;
  poNumber: string;
  balance: number;
}

export function MarkPaymentSummary({
  amount,
  vendorName,
  poNumber,
  balance,
}: MarkPaymentSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="Amount" value={formatCurrency(amount)} emphasize />
      <SummaryItem label="Payee" value={vendorName} />
      <SummaryItem label="PO" value={poNumber} />
      <SummaryItem label="Balance" value={formatCurrency(balance)} />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-foreground',
          emphasize ? 'text-lg font-semibold' : 'text-sm font-medium'
        )}
      >
        {value}
      </p>
    </div>
  );
}
