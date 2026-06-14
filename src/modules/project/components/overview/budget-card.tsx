import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';

interface BudgetCardProps {
  totalSpent: number;
  budgetLimit: number;
  targetBudgetPercent: number;
  className?: string;
}

export function BudgetCard({
  totalSpent,
  budgetLimit,
  targetBudgetPercent,
  className,
}: BudgetCardProps) {
  const committedUtilization = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;
  const remaining = budgetLimit - totalSpent;

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'bg-destructive';
    if (utilization > 70) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className={cn('flex min-h-80 flex-col', className)}>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">Budget</CardTitle>
      </CardHeader>
      <CardContent className="flex grow flex-col p-0 sm:p-0">
        <div className="flex flex-col px-5 py-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1 leading-tight">
              Total Spent
            </div>
            <div className="text-2xl font-bold tabular-nums leading-tight whitespace-nowrap">
              {formatCurrency(totalSpent)}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-7">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase leading-tight">
                  Spent Utilization
                </span>
                <span className="text-sm font-bold tabular-nums leading-snug whitespace-nowrap">
                  {Math.round(committedUtilization)}%
                </span>
              </div>
              <Progress
                value={Math.min(committedUtilization, 100)}
                className="h-2"
                indicatorClassName={getUtilizationColor(committedUtilization)}
              />
            </div>

            <div>
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1 leading-tight">
                Remaining
              </div>
              <div className="text-base font-bold text-zinc-700 tabular-nums leading-tight whitespace-nowrap">
                {formatCurrency(remaining)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto flex min-h-24 items-center border-t border-separator bg-muted/40 px-5 py-5">
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1 leading-tight">
                Limit
              </div>
              <div className="text-sm font-bold tabular-nums leading-tight whitespace-nowrap">
                {formatCurrency(budgetLimit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1 leading-tight">
                Budget %
              </div>
              <div className="text-sm font-bold tabular-nums leading-tight whitespace-nowrap">
                {targetBudgetPercent}% TCV
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
