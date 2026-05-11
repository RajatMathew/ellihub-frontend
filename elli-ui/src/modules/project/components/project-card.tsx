import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import type { ProjectListItem } from '@/modules/project/schemas/project.schema';

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  if (value > 0) return `+${formatCurrency(value)}`;

  return formatCurrency(0);
};

const getUtilizationColor = (utilization: number): string => {
  if (utilization > 90) return 'bg-destructive';
  if (utilization > 70) return 'bg-warning';

  return 'bg-success';
};

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const originalContractValue = project.contractValue ?? project.primeContract?.contractValue ?? 0;
  const approvedChangeOrdersTotal = project.approvedChangeOrdersTotal ?? 0;
  const revisedContractValue =
    project.revisedContractValue ?? originalContractValue + approvedChangeOrdersTotal;
  const totalPOCommitted = project.totalPOCommitted ?? 0;
  const targetBudgetPercent = project.targetBudgetPercent ?? 100;
  const budgetLimit = project.budgetLimit ?? revisedContractValue * (targetBudgetPercent / 100);
  const spendUtilization =
    project.spendUtilization ?? (budgetLimit > 0 ? (totalPOCommitted / budgetLimit) * 100 : 0);
  const progressValue = Math.min(Math.max(spendUtilization, 0), 100);
  const spendUtilizationLabel = `${Math.round(spendUtilization)}%`;
  const approvedChangeOrdersValueClassName = cn(
    approvedChangeOrdersTotal < 0 && 'text-destructive',
    approvedChangeOrdersTotal > 0 && 'text-success',
    approvedChangeOrdersTotal === 0 && 'text-muted-foreground'
  );

  return (
    <Link
      to={`/app/project/${project.id}/overview`}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="flex h-full flex-col space-y-3 p-4">
          <div className="flex min-h-9 items-start justify-between gap-2">
            <span className="line-clamp-2 flex-1 text-sm font-semibold uppercase leading-tight">
              {project.name}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{project.gc?.name ?? 'N/A'}</span>
            <span className="min-w-0 truncate text-right">{project.leadPM?.name ?? 'N/A'}</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="mb-1 text-xs uppercase leading-none text-muted-foreground">
                Contract Sum
              </p>
              <p className="truncate text-sm font-semibold">{formatCurrency(revisedContractValue)}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-xs uppercase leading-none text-muted-foreground">
                Approved COs
              </p>
              <p className={cn('truncate text-sm font-semibold', approvedChangeOrdersValueClassName)}>
                {formatSignedCurrency(approvedChangeOrdersTotal)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase leading-none text-muted-foreground">
                Spend Utilization
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {spendUtilizationLabel}
              </span>
            </div>
            <Progress
              value={progressValue}
              className="h-2 flex-1"
              indicatorClassName={getUtilizationColor(spendUtilization)}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
