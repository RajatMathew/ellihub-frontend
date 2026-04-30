import { Link } from 'react-router-dom';

import { Card, CardContent } from '@app/components/ui/card';
import { Progress } from '@app/components/ui/progress';
import { formatCurrency } from '@app/lib/helpers';
import type { ProjectListItem } from '@modules/project/schemas/project.schema';

const formatSignedCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  if (value > 0) return `+${formatCurrency(value)}`;
  return formatCurrency(0);
};

const getUtilizationColor = (utilization: number): string => {
  if (utilization > 90) return 'bg-red-500';
  if (utilization > 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const originalContractValue = project.contractValue ?? project.primeContract?.contractValue ?? 0;
  const approvedChangeOrdersTotal = project.approvedChangeOrdersTotal ?? 0;
  const revisedContractValue =
    project.revisedContractValue ?? originalContractValue + approvedChangeOrdersTotal;
  const totalPOCommitted = project.totalPOCommitted ?? 0;
  const targetBudgetPercent = project.targetBudgetPercent ?? 100;
  const budgetLimit =
    project.budgetLimit ?? revisedContractValue * (targetBudgetPercent / 100);
  const spendUtilization =
    project.spendUtilization ?? (budgetLimit > 0 ? (totalPOCommitted / budgetLimit) * 100 : 0);
  const progressValue = Math.min(Math.max(spendUtilization, 0), 100);
  const spendUtilizationLabel = `${Math.round(spendUtilization)}%`;
  const approvedChangeOrdersValueClassName =
    approvedChangeOrdersTotal < 0
      ? 'text-destructive'
      : approvedChangeOrdersTotal > 0
        ? 'text-emerald-600 dark:text-emerald-500'
        : 'text-muted-foreground';

  return (
    <Link to={`/app/project/${project.id}/overview`} className="block h-full">
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardContent className="p-4 space-y-3 h-full flex flex-col">
          {/* Row 1: Name + Stage badge */}
          <div className="flex items-start justify-between gap-2 min-h-9">
            <span className="flex-1 text-sm font-semibold uppercase leading-tight line-clamp-2">
              {project.name}
            </span>
          </div>

          {/* Row 2: GC + Lead PM */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{project.gc?.name ?? '—'}</span>
            <span className="truncate text-right">{project.leadPM?.name ?? '—'}</span>
          </div>

          {/* Row 3: Cost + Balance */}
          <div className="flex items-end justify-between gap-2 mt-auto">
            <div>
              <p className="text-[0.625rem] uppercase text-muted-foreground leading-none mb-1">
                Contract Sum
              </p>
              <p className="text-sm font-semibold">{formatCurrency(revisedContractValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] uppercase text-muted-foreground leading-none mb-1">
                Approved COs
              </p>
              <p className={`text-sm font-semibold ${approvedChangeOrdersValueClassName}`}>
                {formatSignedCurrency(approvedChangeOrdersTotal)}
              </p>
            </div>
          </div>

          {/* Row 4: Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.625rem] uppercase text-muted-foreground leading-none">
                Spend Utilization
              </span>
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
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
