import { memo } from 'react';

import { ImportedBadge } from '@/app/components/import-source';
import { Badge } from '@/app/components/ui/badge';
import { ListingIdentifierText } from '@/app/components/ui/listing-identifier';
import { Progress } from '@/app/components/ui/progress';
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { PROJECT_STATUS_LABELS } from '@/modules/project/constants/project-form.constants';
import { getProjectStageSwatchClassName } from '@/modules/project/lib/project-stage-colors';
import type { ProjectListItem, ProjectStatusEnum } from '@/modules/project/schemas/project.schema';
import { Link } from 'react-router-dom';

const STATUS_DOT_CLASS: Record<ProjectStatusEnum, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-warning',
  CLOSED: 'bg-muted-foreground',
  COMPLETED: 'bg-primary',
};

const listGridClassName =
  'grid grid-cols-[minmax(230px,1.45fr)_minmax(170px,0.85fr)_minmax(190px,1fr)_minmax(175px,0.85fr)_minmax(190px,1fr)_minmax(130px,0.65fr)]';

// A calendar date, read as written: converting it to the viewer's clock showed
// a TCO of Jan 1 as Dec 31 in New York.
const formatProjectDate = (value: string | null | undefined): string =>
  formatDateOnly(value, { day: '2-digit', month: 'short', year: 'numeric' }, '-');

const formatBalanceCurrency = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;

  return formatCurrency(value);
};

const getLookupLabel = (
  value: ProjectListItem['stage'] | ProjectListItem['statusRef'] | ProjectListItem['status']
): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;

  return value.label ?? value.name ?? value.id;
};

const getDivisionLabel = (project: ProjectListItem): string => {
  const division = project.division;

  if (!division) return 'Unassigned';
  if (typeof division === 'string') return division;

  return division.label ?? division.name ?? 'Unassigned';
};

const getStatusLabel = (project: ProjectListItem): string => {
  const status = project.status;
  const statusRefLabel = getLookupLabel(project.statusRef);

  if (status && PROJECT_STATUS_LABELS[status]) return PROJECT_STATUS_LABELS[status];

  return statusRefLabel ?? status ?? '-';
};

const getStatusDotClassName = (project: ProjectListItem): string => {
  const status = project.status;

  return status ? STATUS_DOT_CLASS[status] : 'bg-muted-foreground';
};

function getProjectFinancials(project: ProjectListItem) {
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

  return {
    originalContractValue,
    revisedContractValue,
    totalSpent,
    budgetRemaining,
    spendUtilization,
    progressValue: Math.min(Math.max(spendUtilization, 0), 100),
  };
}

function ProjectStageBadge({ project }: { project: ProjectListItem }) {
  const stageLabel = getLookupLabel(project.stage);
  if (!stageLabel) return null;

  return (
    <Badge variant="outline" appearance="outline" size="sm" className="max-w-full justify-start">
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-[2px]',
          getProjectStageSwatchClassName(stageLabel)
        )}
        aria-hidden="true"
      />
      <span className="truncate">{stageLabel}</span>
    </Badge>
  );
}

function ProjectStatusBadge({ project }: { project: ProjectListItem }) {
  return (
    <Badge variant="outline" appearance="outline" size="sm" className="max-w-full justify-start">
      <span className={cn('size-1.5 shrink-0 rounded-full', getStatusDotClassName(project))} />
      <span className="truncate">{getStatusLabel(project)}</span>
    </Badge>
  );
}

export const ProjectListTable = memo(function ProjectListTable({
  projects,
}: {
  projects: ProjectListItem[];
}) {
  return (
    <div className="min-w-0">
      <div className="grid gap-2.5 lg:hidden">
        {projects.map((project) => (
          <ProjectMobileListCard key={project.id} project={project} />
        ))}
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-card-border bg-card shadow-xs shadow-black/5 lg:block">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <div className="min-w-[1080px]">
            <div
              className={cn(
                listGridClassName,
                'border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground'
              )}
            >
              <div>Project</div>
              <div>Stage / Status</div>
              <div>Team</div>
              <div>Contract</div>
              <div>Spend</div>
              <div>TCO</div>
            </div>

            <div className="divide-y divide-border">
              {projects.map((project) => (
                <ProjectDesktopListRow key={project.id} project={project} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const ProjectDesktopListRow = memo(function ProjectDesktopListRow({
  project,
}: {
  project: ProjectListItem;
}) {
  const financials = getProjectFinancials(project);
  const projectIdentifier = project.jobNumber ?? project.contractNumber ?? project.id;
  const tcoDateLabel = formatProjectDate(project.tcoDate ?? project.estimatedEndDate);
  const balanceClassName = financials.budgetRemaining < 0 ? 'text-destructive' : 'text-foreground';

  return (
    <Link
      to={`/app/project/${project.id}/overview`}
      className={cn(
        listGridClassName,
        'group px-4 py-3 text-sm transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <div className="min-w-0 pr-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <ListingIdentifierText value={projectIdentifier} className="block truncate" />
          <ImportedBadge source={project.importSource} static />
        </div>
        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={project.name}>
          {project.name}
        </div>
        <div
          className="mt-1 truncate text-xs text-muted-foreground"
          title={getDivisionLabel(project)}
        >
          {getDivisionLabel(project)}
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-1.5 pr-4">
        <ProjectStageBadge project={project} />
        <ProjectStatusBadge project={project} />
      </div>

      <div className="min-w-0 pr-4 text-xs">
        <div className="truncate font-medium text-foreground" title={project.gc?.name ?? undefined}>
          {project.gc?.name ?? 'No GC assigned'}
        </div>
        <div
          className="mt-1 truncate text-muted-foreground"
          title={project.leadPM?.name ?? undefined}
        >
          {project.leadPM?.name ?? 'No PM assigned'}
        </div>
      </div>

      <div className="min-w-0 pr-4 text-right text-xs tabular-nums">
        <div className="font-semibold text-foreground">
          {formatCurrency(financials.revisedContractValue)}
        </div>
        <div className="mt-1 text-muted-foreground">
          Original {formatCurrency(financials.originalContractValue)}
        </div>
      </div>

      <div className="min-w-0 pr-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(financials.totalSpent)}
          </span>
          <span className={cn('font-semibold tabular-nums', balanceClassName)}>
            {formatBalanceCurrency(financials.budgetRemaining)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Progress
            value={financials.progressValue}
            className="h-1.5 flex-1 rounded-none bg-muted"
            indicatorClassName={
              financials.spendUtilization > 90
                ? 'bg-destructive'
                : financials.spendUtilization > 70
                  ? 'bg-warning'
                  : 'bg-success'
            }
          />
          <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
            {Math.round(financials.spendUtilization)}%
          </span>
        </div>
      </div>

      <div className="min-w-0 text-xs text-muted-foreground">
        <div className="font-medium tabular-nums text-foreground">{tcoDateLabel}</div>
        <div className="mt-1 truncate">
          {project.city || project.state
            ? [project.city, project.state].filter(Boolean).join(', ')
            : 'No location'}
        </div>
      </div>
    </Link>
  );
});

const ProjectMobileListCard = memo(function ProjectMobileListCard({
  project,
}: {
  project: ProjectListItem;
}) {
  const financials = getProjectFinancials(project);
  const projectIdentifier = project.jobNumber ?? project.contractNumber ?? project.id;
  const tcoDateLabel = formatProjectDate(project.tcoDate ?? project.estimatedEndDate);

  return (
    <Link
      to={`/app/project/${project.id}/overview`}
      className="block min-w-0 rounded-md border border-card-border bg-card p-3 shadow-xs shadow-black/5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <ListingIdentifierText value={projectIdentifier} className="block truncate text-sm" />
            <ImportedBadge source={project.importSource} static />
          </div>
          <div
            className="mt-1 line-clamp-2 text-sm font-medium text-foreground"
            title={project.name}
          >
            {project.name}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
          {tcoDateLabel}
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
        <ProjectStageBadge project={project} />
        <ProjectStatusBadge project={project} />
        <Badge variant="outline" appearance="outline" size="sm" className="max-w-full">
          <span className="truncate">{getDivisionLabel(project)}</span>
        </Badge>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 text-xs">
        <ProjectMobileMetric label="GC" value={project.gc?.name ?? 'No GC assigned'} />
        <ProjectMobileMetric label="Lead PM" value={project.leadPM?.name ?? 'No PM assigned'} />
        <ProjectMobileMetric
          label="Contract"
          value={formatCurrency(financials.revisedContractValue)}
        />
        <ProjectMobileMetric label="Spent" value={formatCurrency(financials.totalSpent)} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Progress
          value={financials.progressValue}
          className="h-1.5 flex-1 rounded-none bg-muted"
          indicatorClassName={
            financials.spendUtilization > 90
              ? 'bg-destructive'
              : financials.spendUtilization > 70
                ? 'bg-warning'
                : 'bg-success'
          }
        />
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {Math.round(financials.spendUtilization)}%
        </span>
      </div>
    </Link>
  );
});

function ProjectMobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium tabular-nums text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
