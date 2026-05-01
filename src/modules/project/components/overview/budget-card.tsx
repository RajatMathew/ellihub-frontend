import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { formatCurrency } from '@/app/lib/helpers';

interface BudgetCardProps {
  totalSpent: number;
  budgetLimit: number;
  targetBudgetPercent: number;
}

export function BudgetCard({
  totalSpent,
  budgetLimit,
  targetBudgetPercent,
}: BudgetCardProps) {
  const committedUtilization =
    budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;
  const remaining = budgetLimit - totalSpent;

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'bg-destructive';
    if (utilization > 70) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="flex min-h-80 flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between grow">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-0.5 leading-tight">
            Total Spent
          </div>
          <div className="text-2xl font-bold tabular-nums leading-tight">
            {formatCurrency(totalSpent)}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase leading-tight">
                Spent Utilization
              </span>
              <span className="text-sm font-semibold leading-snug">
                {Math.round(committedUtilization)}%
              </span>
            </div>
            <Progress
              value={Math.min(committedUtilization, 100)}
              className="h-2.5"
              indicatorClassName={getUtilizationColor(committedUtilization)}
            />
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-0.5 leading-tight">
              Remaining
            </div>
            <div className="text-xl font-bold tabular-nums leading-tight">
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-0.5 leading-tight">
              Limit
            </div>
            <div className="text-sm font-semibold tabular-nums leading-snug">
              {formatCurrency(budgetLimit)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-0.5 leading-tight">
              Budget %
            </div>
            <div className="text-sm font-semibold tabular-nums leading-snug">
              {targetBudgetPercent}% TCV
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
