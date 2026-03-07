import { Card, CardContent } from '@app/components/ui/card';
import { formatCurrency } from '@app/lib/helpers';

import type { PrimeContractComputations } from './use-prime-contract-computations';

interface PrimeContractStatsBarProps {
  computations: PrimeContractComputations;
}

interface StatItemProps {
  label: string;
  value: number;
  dotColor?: string;
}

function StatItem({ label, value, dotColor = 'bg-muted-foreground' }: StatItemProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`size-2.5 rounded-full ${dotColor} shrink-0`} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-lg font-semibold">{formatCurrency(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrimeContractStatsBar({ computations }: PrimeContractStatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatItem
        label="Original Contract"
        value={computations.original}
        dotColor="bg-muted-foreground"
      />
      <StatItem
        label="Approved COs"
        value={computations.approvedCOs}
        dotColor="bg-success"
      />
      <StatItem
        label="Contract Sum"
        value={computations.contractSum}
        dotColor="bg-primary"
      />
      <StatItem
        label="Balance Due"
        value={computations.balanceDue}
        dotColor="bg-orange-500"
      />
    </div>
  );
}
