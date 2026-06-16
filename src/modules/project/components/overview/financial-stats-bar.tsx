import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';
import type { PrimeContractComputations } from '@/modules/project/components/overview/use-prime-contract-computations';
import type { PrimeChangeOrderFinancialSummary } from '@/modules/project/schemas/prime-change-order';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';

interface FinancialStatsBarProps {
  computations: PrimeContractComputations;
  contract: PrimeContract | undefined;
  primeChangeOrderSummary: PrimeChangeOrderFinancialSummary | undefined;
  totalCommitted: number;
  activePOsCount: number;
  approvedSCOsCount: number;
}

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return `+${formatCurrency(value)}`;
};

export function FinancialStatsBar({
  computations,
  contract,
  primeChangeOrderSummary,
  totalCommitted,
  activePOsCount,
  approvedSCOsCount,
}: FinancialStatsBarProps) {
  const approvedCOsCount = primeChangeOrderSummary?.approvedChangeOrdersCount ?? 0;
  const positiveApprovedCOs = primeChangeOrderSummary?.approvedChangeOrdersPositiveTotal ?? 0;
  const negativeApprovedCOs = primeChangeOrderSummary?.approvedChangeOrdersNegativeTotal ?? 0;
  const approvedCOsValueColor = computations.approvedCOs < 0 ? 'text-destructive' : 'text-success';
  const approvedCOsParts = [
    positiveApprovedCOs !== 0 ? formatSignedCurrency(positiveApprovedCOs) : '',
    negativeApprovedCOs !== 0 ? formatSignedCurrency(negativeApprovedCOs) : '',
  ].filter(Boolean);
  const approvedCOsDescription =
    approvedCOsParts.length > 0
      ? `${approvedCOsCount} approved COs | ${approvedCOsParts.join(' / ')}`
      : `${approvedCOsCount} approved COs`;

  return (
    <StatsBar variant="cards" width="full" columns={{ base: 1, sm: 2, xl: 4 }}>
      <StatsBarItem
        variant="card"
        label="Original"
        value={formatCurrency(computations.original)}
        description={contract?.contractType ?? 'Original Contract'}
        dotColor="bg-label-lighter"
        valueColor="text-foreground"
      />
      <StatsBarItem
        variant="card"
        label="Approved COs"
        value={formatSignedCurrency(computations.approvedCOs)}
        description={approvedCOsDescription}
        dotColor="bg-success"
        valueColor={approvedCOsValueColor}
      />
      <StatsBarItem
        variant="card"
        label="Contract Sum"
        value={formatCurrency(computations.contractSum)}
        description="Revised Total"
        dotColor="bg-foreground"
        valueColor="text-foreground"
      />
      <StatsBarItem
        variant="card"
        label="Committed"
        value={formatCurrency(totalCommitted)}
        description={`${activePOsCount} issued/delivered POs + ${approvedSCOsCount} approved SCOs`}
        dotColor="bg-warning"
        valueColor="text-warning"
      />
    </StatsBar>
  );
}
