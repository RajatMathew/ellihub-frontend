import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { getProjectStageSwatchClassName } from '@/modules/project/lib/project-stage-colors';
import type { ProjectListItem } from '@/modules/project/schemas/project.schema';
import { Link } from 'react-router-dom';

const formatProjectDate = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatBalanceCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;

  return formatCurrency(value);
};

const truncateName = (value: string, maxLength = 17): string => {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
};

const getUtilizationColor = (utilization: number): string => {
  if (utilization > 90) return 'bg-destructive';
  if (utilization > 70) return 'bg-warning';

  return 'bg-success';
};

const getLookupLabel = (
  value: ProjectListItem['stage'] | ProjectListItem['statusRef'] | ProjectListItem['status']
): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;

  return value.label ?? value.name ?? value.id;
};

function ProjectPartyName({
  name,
  fallback,
  className,
  maxLength = 22,
}: {
  name: string | null | undefined;
  fallback: string;
  className?: string;
  maxLength?: number;
}) {
  const displayName = name ? truncateName(name, maxLength) : fallback;
  const shouldShowTooltip = Boolean(name && name.length > maxLength);

  if (!shouldShowTooltip) {
    return <span className={cn('min-w-0 truncate', className)}>{displayName}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('min-w-0 truncate', className)}>{displayName}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{name}</TooltipContent>
    </Tooltip>
  );
}

function ProjectName({ name }: { name: string }) {
  const displayName = truncateName(name, 30);
  const shouldShowTooltip = name.length > 30;

  if (!shouldShowTooltip) {
    return (
      <span className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
        {displayName}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {displayName}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{name}</TooltipContent>
    </Tooltip>
  );
}

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const originalContractValue = project.contractValue ?? project.primeContract?.contractValue ?? 0;
  const approvedChangeOrdersTotal = project.approvedChangeOrdersTotal ?? 0;
  const revisedContractValue =
    project.revisedContractValue ?? originalContractValue + approvedChangeOrdersTotal;
  const totalPOCommitted = project.totalPOCommitted ?? 0;
  const approvedSCOTotal = project.approvedSCOTotal ?? 0;
  const totalSpent = project.totalSpent ?? totalPOCommitted + approvedSCOTotal;
  const targetBudgetPercent = project.targetBudgetPercent ?? 100;
  const budgetLimit = project.budgetLimit ?? revisedContractValue * (targetBudgetPercent / 100);
  const budgetRemaining = project.budgetRemaining ?? budgetLimit - totalSpent;
  const spendUtilization =
    project.spendUtilization ?? (budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0);
  const progressValue = Math.min(Math.max(spendUtilization, 0), 100);
  const spendUtilizationLabel = `${Math.round(spendUtilization)}%`;
  const stageLabel = getLookupLabel(project.stage);
  const fallbackStatusLabel = getLookupLabel(project.statusRef ?? project.status);
  const badgeLabel = stageLabel ?? fallbackStatusLabel;
  const badgeDotClassName = getProjectStageSwatchClassName(badgeLabel);
  const balanceClassName = budgetRemaining < 0 ? 'text-destructive' : 'text-foreground';
  const projectIdentifier = project.jobNumber ?? project.contractNumber ?? project.id;
  const tcoDateLabel = formatProjectDate(project.tcoDate ?? project.estimatedEndDate);

  return (
    <Link
      to={`/app/project/${project.id}/overview`}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full rounded-lg border-zinc-300/70 bg-card shadow-none transition-all duration-100 ease-out hover:-translate-y-0.5 hover:border-zinc-400/60 hover:shadow-md hover:shadow-zinc-950/10 dark:border-zinc-600/80 dark:bg-zinc-950/50 dark:hover:border-zinc-500/70 dark:hover:shadow-black/30">
        <CardContent className="flex flex-col gap-2 p-3.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                {projectIdentifier}
              </span>
            </div>
            {badgeLabel && (
              <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-zinc-300/80 bg-background px-2 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-foreground/75 dark:border-zinc-600/80 dark:bg-zinc-950/60">
                <span className={cn('size-1.5 rounded-[2px]', badgeDotClassName)} aria-hidden="true" />
                {badgeLabel}
              </span>
            )}
          </div>
          <div className="pt-0.5">
            <ProjectName name={project.name} />
          </div>

          <div className="flex items-center justify-between gap-4 pt-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
            <ProjectPartyName name={project.gc?.name} fallback="No GC assigned" />
            <ProjectPartyName
              name={project.leadPM?.name}
              fallback="No PM assigned"
              className="text-right"
            />
          </div>

          <div className="flex items-end justify-between gap-4 pt-1">
            <div className="min-w-0">
              <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Total Cost
              </p>
              <p className="truncate text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Balance
              </p>
              <p className={cn('truncate text-sm font-semibold tabular-nums', balanceClassName)}>
                {formatBalanceCurrency(budgetRemaining)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Progress
              value={progressValue}
              className="h-1.5 flex-1 rounded-none bg-muted"
              indicatorClassName={getUtilizationColor(spendUtilization)}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              {spendUtilizationLabel}
            </span>
          </div>

          {tcoDateLabel && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="h-px w-14 bg-border dark:bg-zinc-700/70" aria-hidden="true" />
              <span className="shrink-0">TCO: {tcoDateLabel}</span>
              <span className="h-px w-14 bg-border dark:bg-zinc-700/70" aria-hidden="true" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
