import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Progress } from '@app/components/ui/progress';
import { Separator } from '@app/components/ui/separator';
import { formatCurrency } from '@app/lib/helpers';

import type { PrimeContractComputations } from './use-prime-contract-computations';

interface BudgetCCOCardProps {
  computations: PrimeContractComputations;
}

export function BudgetCCOCard({ computations }: BudgetCCOCardProps) {
  const utilization = Math.min(computations.spentUtilization, 100);

  return (
    <Card>
      <CardHeader className="bg-foreground text-background rounded-t-xl border-l-4 border-l-warning">
        <CardTitle className="text-xs font-bold tracking-widest uppercase text-background">
          Budget (CCO)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold">{formatCurrency(computations.paidToDate)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Spent Utilization</span>
            <span className="font-medium">{utilization.toFixed(1)}%</span>
          </div>
          <Progress
            value={utilization}
            indicatorClassName={
              utilization > 90
                ? 'bg-destructive'
                : utilization > 70
                  ? 'bg-orange-500'
                  : 'bg-success'
            }
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-muted-foreground">Remaining</span>
          <span className="text-sm font-medium">
            {formatCurrency(computations.budgetRemaining)}
          </span>
        </div>

        <Separator />

        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-muted-foreground">Limit</span>
          <span className="text-sm font-medium">
            {formatCurrency(computations.budgetLimit)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-muted-foreground">Budget % TCV</span>
          <span className="text-sm font-medium">
            {computations.targetBudgetPercent}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
