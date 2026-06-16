import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatPercent } from '@/app/lib/helpers';
import type { PrimeContractComputations } from '@/modules/project/components/overview/use-prime-contract-computations';
import { InfoRow } from '@/modules/project/components/shared';

interface FinancialSummarySimpleCardProps {
  computations: PrimeContractComputations;
}

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return `+${formatCurrency(value)}`;
};

export function FinancialSummarySimpleCard({ computations }: FinancialSummarySimpleCardProps) {
  const approvedCOsValueClassName =
    computations.approvedCOs < 0
      ? 'text-destructive text-sm font-bold tabular-nums'
      : 'text-info text-sm font-bold tabular-nums';

  return (
    <Card className="flex min-h-80 flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col grow p-0 sm:p-0">
        <div className="flex flex-col px-5 py-5">
          <div className="flex flex-col gap-y-3.5 border-b-2 border-separator pb-3.5">
            <InfoRow
              label="Original Contract"
              className="uppercase"
              labelClassName="text-foreground text-sm font-bold"
              valueClassName="whitespace-nowrap text-sm font-bold tabular-nums"
            >
              {formatCurrency(computations.original)}
            </InfoRow>
            <InfoRow
              label="Approved COs"
              labelVariant="light"
              labelClassName="text-sm font-medium"
              valueClassName={`whitespace-nowrap ${approvedCOsValueClassName}`}
            >
              {formatSignedCurrency(computations.approvedCOs)}
            </InfoRow>
          </div>
          <div className="flex flex-col gap-y-3.5 border-b-2 border-separator py-3.5">
            <InfoRow
              label="Contract Sum"
              className="uppercase"
              labelClassName="text-foreground text-sm font-bold"
              valueClassName="whitespace-nowrap text-sm font-bold tabular-nums"
            >
              {formatCurrency(computations.contractSum)}
            </InfoRow>
            <InfoRow
              label="Paid to Date"
              labelVariant="light"
              labelClassName="text-sm font-medium"
              valueClassName="whitespace-nowrap text-muted-foreground text-sm font-bold tabular-nums"
            >
              {formatCurrency(computations.paidToDate)}
            </InfoRow>
          </div>
          <InfoRow
            label="Balance Due"
            className="pt-3.5 uppercase"
            labelClassName="text-foreground text-sm font-bold"
            valueClassName="whitespace-nowrap text-info text-sm font-bold tabular-nums"
          >
            {formatCurrency(computations.balanceDue)}
          </InfoRow>
        </div>
        <div className="mt-auto flex min-h-24 items-center border-t border-separator bg-muted/40 px-5 py-5">
          <div className="flex w-full flex-col gap-y-3.5">
            <InfoRow
              label="Retainage %:"
              labelVariant="light"
              labelClassName="text-sm font-medium"
              valueClassName="whitespace-nowrap text-sm font-bold tabular-nums"
            >
              {formatPercent(computations.retainagePercent)}
            </InfoRow>
            <InfoRow
              label="Retainage Amount:"
              labelVariant="light"
              labelClassName="text-sm font-medium"
              valueClassName="whitespace-nowrap text-sm font-bold tabular-nums"
            >
              {formatCurrency(computations.retainageAmount)}
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
