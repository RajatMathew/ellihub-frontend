import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';
import type { PrimeContractComputations } from '@/modules/project/components/overview/use-prime-contract-computations';
import type { PrimeChangeOrderFinancialSummary } from '@/modules/project/schemas/prime-change-order';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';

interface FinancialStatsBarProps {
  computations: PrimeContractComputations;
  contract: PrimeContract | undefined;
  primeChangeOrderSummary: PrimeChangeOrderFinancialSummary | undefined;
  totalPOCommitted: number;
  activePOsCount: number;
}

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return `+${formatCurrency(value)}`;
};

export function FinancialStatsBar({
  computations,
  contract,
  primeChangeOrderSummary,
  totalPOCommitted,
  activePOsCount,
}: FinancialStatsBarProps) {
  const approvedCOsCount = primeChangeOrderSummary?.approvedChangeOrdersCount ?? 0;
  const positiveApprovedCOs = primeChangeOrderSummary?.approvedChangeOrdersPositiveTotal ?? 0;
  const negativeApprovedCOs = primeChangeOrderSummary?.approvedChangeOrdersNegativeTotal ?? 0;
  const approvedCOsValueColor =
    computations.approvedCOs < 0 ? 'text-destructive' : 'text-success';
  const approvedCOsParts = [
    positiveApprovedCOs !== 0 ? formatSignedCurrency(positiveApprovedCOs) : '',
    negativeApprovedCOs !== 0 ? formatSignedCurrency(negativeApprovedCOs) : '',
  ].filter(Boolean);
  const approvedCOsDescription =
    approvedCOsParts.length > 0
      ? `${approvedCOsCount} approved COs | ${approvedCOsParts.join(' / ')}`
      : `${approvedCOsCount} approved COs`;

  return (
    <StatsBar>
      <StatsBarItem
        label="Original"
        value={formatCurrency(computations.original)}
        description={contract?.contractType ?? 'Original Contract'}
        dotColor="bg-label-lighter"
        valueColor="text-foreground"
        className="border-b md:border-b-0"
      />
      <StatsBarItem
        label="Approved COs"
        value={formatSignedCurrency(computations.approvedCOs)}
        description={approvedCOsDescription}
        dotColor="bg-success"
        valueColor={approvedCOsValueColor}
        className="border-b md:border-b-0"
      />
      <StatsBarItem
        label="Contract Sum"
        value={formatCurrency(computations.contractSum)}
        description="Revised Total"
        dotColor="bg-foreground"
        valueColor="text-foreground"
        className="border-b md:border-b-0"
      />
      <StatsBarItem
        label="Committed (POs)"
        value={formatCurrency(totalPOCommitted)}
        description={`${activePOsCount} issued/delivered purchase orders`}
        dotColor="bg-warning"
        valueColor="text-warning"
      />
    </StatsBar>
  );
}
