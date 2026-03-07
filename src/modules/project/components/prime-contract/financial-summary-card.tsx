import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Separator } from '@app/components/ui/separator';
import { formatCurrency } from '@app/lib/helpers';

import type { PrimeContractComputations } from './use-prime-contract-computations';

interface FinancialSummaryCardProps {
  computations: PrimeContractComputations;
}

function FinRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${className ?? ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueClassName ?? ''}`}>{value}</span>
    </div>
  );
}

export function FinancialSummaryCard({ computations }: FinancialSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="bg-foreground text-background rounded-t-xl border-l-4 border-l-warning">
        <CardTitle className="text-xs font-bold tracking-widest uppercase text-background">
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-1">
        <FinRow label="Original Contract" value={formatCurrency(computations.original)} />
        <FinRow
          label="Approved COs"
          value={`+${formatCurrency(computations.approvedCOs)}`}
          valueClassName="text-success"
        />
        <FinRow
          label="CONTRACT SUM"
          value={formatCurrency(computations.contractSum)}
          className="font-bold"
          valueClassName="font-bold"
        />
        <FinRow label="Paid to Date" value={formatCurrency(computations.paidToDate)} />
        <FinRow
          label="BALANCE DUE"
          value={formatCurrency(computations.balanceDue)}
          valueClassName="text-destructive font-bold"
        />

        <Separator className="my-2" />

        <FinRow
          label="Retainage %"
          value={`${computations.retainagePercent}%`}
        />
        <FinRow
          label="Retainage Amount"
          value={formatCurrency(computations.retainageAmount)}
        />
      </CardContent>
    </Card>
  );
}
