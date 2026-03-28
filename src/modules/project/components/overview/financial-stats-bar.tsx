import { formatCurrency } from '@app/lib/helpers';
import { cn } from '@app/lib/utils';

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

interface MetricItemProps {
  label: string;
  value: string;
  description?: string;
  dotColor: string;
  valueColor: string;
  className?: string;
}

function MetricItem({
  label,
  value,
  description,
  dotColor,
  valueColor,
  className,
}: MetricItemProps) {
  return (
    <div
      className={cn(
        'bg-white flex flex-col gap-y-1 px-4 py-2.5 border-r border-separator last:border-r-0',
        className
      )}
    >
      <div className="flex items-center gap-x-1.5">
        <div className={cn('size-1.5 rounded-full', dotColor)} />
        <span className="text-label-light font-semibold text-[12px] tracking-[0.3px] uppercase">
          {label}
        </span>
      </div>
      <div className={cn('leading-[1.55556] font-semibold text-[18px]', valueColor)}>
        {value}
      </div>
      {description && (
        <span className="text-label-lighter font-medium text-[13px]">{description}</span>
      )}
    </div>
  );
}

export function FinancialStatsBar({
  computations,
  contract,
  pipeline,
  totalPOCommitted,
  activePOsCount,
}: FinancialStatsBarProps) {
  const approvedCOsCount =
    (pipeline?.approved?.count ?? 0) + (pipeline?.executed?.count ?? 0);

  return (
    <div className="w-full bg-card text-foreground leading-normal grid grid-cols-1 md:grid-cols-4 border border-separator overflow-hidden rounded-xl">
      <MetricItem
        label="Original"
        value={formatCurrency(computations.original)}
        description={`${contract?.contractType ?? 'Original Contract'}`}
        dotColor="bg-[lab(65.6464_1.53497_-5.42429)]"
        valueColor="text-[lab(8.30603_0.618205_-2.16572)]"
        className="border-b md:border-b-0"
      />
      <MetricItem
        label="Approved COs"
        value={`+${formatCurrency(computations.approvedCOs)}`}
        description={`${approvedCOsCount} approved COs`}
        dotColor="bg-[lab(66.9756_-58.27_19.5419)]"
        valueColor="text-[lab(55.0481_-49.9246_15.93)]"
        className="border-b md:border-b-0"
      />
      <MetricItem
        label="Contract Sum"
        value={formatCurrency(computations.contractSum)}
        description="Revised Total"
        dotColor="bg-[lab(8.30603_0.618205_-2.16572)]"
        valueColor="text-[lab(8.30603_0.618205_-2.16572)]"
        className="border-b md:border-b-0"
      />
      <MetricItem
        label="Committed (POs)"
        value={formatCurrency(totalPOCommitted)}
        description={`${activePOsCount} active purchase orders`}
        dotColor="bg-[lab(72.7183_31.8672_97.9407)]"
        valueColor="text-[lab(60.3514_40.5624_87.1228)]"
      />
    </div>
  );
}
