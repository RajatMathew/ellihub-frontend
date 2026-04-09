import { StatsBar, StatsBarItem } from '@app/components/ui/stats-bar';
import { formatCurrency } from '@app/lib/helpers';

import type { PrimeContractComputations } from '@modules/project/components/prime-contract/use-prime-contract-computations';
import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';
import type { PCOPipeline } from '@modules/project/schemas/pco.schema';

interface FinancialStatsBarProps {
  computations: PrimeContractComputations;
  contract: PrimeContract | undefined;
  pipeline: PCOPipeline | undefined;
  totalPOCommitted: number;
  activePOsCount: number;
}

export function FinancialStatsBar({
  computations,
  contract,
  pipeline,
  totalPOCommitted,
  activePOsCount,
}: FinancialStatsBarProps) {
  const approvedCOsCount = (pipeline?.approved?.count ?? 0) + (pipeline?.executed?.count ?? 0);

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
        value={`+${formatCurrency(computations.approvedCOs)}`}
        description={`${approvedCOsCount} approved COs`}
        dotColor="bg-emerald-500"
        valueColor="text-emerald-600 dark:text-emerald-500"
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
        description={`${activePOsCount} active purchase orders`}
        dotColor="bg-amber-500"
        valueColor="text-amber-600 dark:text-amber-500"
      />
    </StatsBar>
  );
}
