import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatPercent } from '@/app/lib/helpers';

import { InfoRow } from '@/modules/project/components/shared';
import type { PrimeContractComputations } from '@/modules/project/components/overview/use-prime-contract-computations';

interface FinancialSummarySimpleCardProps {
  computations: PrimeContractComputations;
}

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return `+${formatCurrency(value)}`;
};

export function FinancialSummarySimpleCard({
  computations,
}: FinancialSummarySimpleCardProps) {
  const approvedCOsValueClassName =
    computations.approvedCOs < 0 ? 'text-destructive font-bold' : 'text-info font-bold';

  return (
    <Card className="flex min-h-80 flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col grow p-0">
        <div className="pt-6 pb-4 px-4 flex flex-col gap-y-2.5">
          <InfoRow label="Original Contract" className="uppercase" valueClassName="font-bold">
            {formatCurrency(computations.original)}
          </InfoRow>
          <InfoRow
            label="Approved COs"
            labelVariant="lighter"
            labelClassName="font-medium"
            valueClassName={approvedCOsValueClassName}
          >
            {formatSignedCurrency(computations.approvedCOs)}
          </InfoRow>
          <InfoRow
            label="Contract Sum"
            className="pt-3 pb-1 border-t-2 border-separator uppercase"
            valueClassName="font-bold"
          >
            {formatCurrency(computations.contractSum)}
          </InfoRow>
          <InfoRow
            label="Paid to Date"
            labelVariant="lighter"
            labelClassName="font-medium"
            className="pb-3 border-b-2 border-separator"
            valueClassName="text-muted-foreground font-bold"
          >
            {formatCurrency(computations.paidToDate)}
          </InfoRow>
          <InfoRow
            label="Balance Due"
            className="pt-1 uppercase"
            valueClassName="text-info font-bold"
          >
            {formatCurrency(computations.balanceDue)}
          </InfoRow>
        </div>
        <div className="mt-auto p-5 border-t bg-muted/20">
          <div className="flex flex-col gap-y-2">
            <InfoRow label="Retainage %:">{formatPercent(computations.retainagePercent)}</InfoRow>
            <InfoRow label="Retainage Amount:">
              {formatCurrency(computations.retainageAmount)}
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
