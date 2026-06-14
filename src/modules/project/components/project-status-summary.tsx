import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import type { ProjectStatusStatsItem } from '@/modules/project/schemas/project.schema';

interface StatusGroup {
  id: string;
  label: string;
  dotClassName: string;
  totalContractValue: number;
  count: number;
}

interface ProjectStatusSummaryProps {
  items: ProjectStatusStatsItem[];
  activeStatusId?: string;
  onStatusClick: (id: string | undefined) => void;
}

const STATUS_DOT_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-warning',
  CLOSED: 'bg-muted-foreground',
  COMPLETED: 'bg-primary',
};

const STATUS_FILTER_TONE_CLASSES: Record<
  string,
  {
    active: string;
    dot: string;
    hover: string;
  }
> = {
  ACTIVE: {
    active:
      'border-foreground/35 bg-muted/45 ring-foreground/10 dark:border-foreground/55 dark:bg-foreground/10 dark:ring-foreground/25',
    dot: 'bg-success',
    hover: 'hover:border-foreground/20',
  },
  INACTIVE: {
    active:
      'border-foreground/35 bg-muted/45 ring-foreground/10 dark:border-foreground/55 dark:bg-foreground/10 dark:ring-foreground/25',
    dot: 'bg-warning',
    hover: 'hover:border-foreground/20',
  },
  CLOSED: {
    active:
      'border-foreground/35 bg-muted/45 ring-foreground/10 dark:border-foreground/55 dark:bg-foreground/10 dark:ring-foreground/25',
    dot: 'bg-muted-foreground',
    hover: 'hover:border-foreground/20',
  },
  COMPLETED: {
    active:
      'border-foreground/35 bg-muted/45 ring-foreground/10 dark:border-foreground/55 dark:bg-foreground/10 dark:ring-foreground/25',
    dot: 'bg-primary',
    hover: 'hover:border-foreground/20',
  },
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  CLOSED: 'Closed',
  COMPLETED: 'Completed',
};

const getStatusDotClassName = (value: string): string => {
  return STATUS_DOT_CLASSES[value.toUpperCase()] ?? 'bg-primary';
};

const getStatusTone = (value: string) => {
  return (
    STATUS_FILTER_TONE_CLASSES[value.toUpperCase()] ?? {
      active:
        'border-foreground/35 bg-muted/45 ring-foreground/10 dark:border-foreground/55 dark:bg-foreground/10 dark:ring-foreground/25',
      dot: getStatusDotClassName(value),
      hover: 'hover:border-foreground/20',
    }
  );
};

export function ProjectStatusSummary({
  items,
  activeStatusId,
  onStatusClick,
}: ProjectStatusSummaryProps) {
  const groups: StatusGroup[] = items.map((item) => ({
    id: item.id,
    label: item.label || STATUS_LABELS[item.id] || item.id,
    dotClassName: getStatusDotClassName(item.id),
    totalContractValue: item.totalContractValue,
    count: item.count,
  }));

  const columnClassName =
    groups.length >= 4
      ? 'xl:grid-cols-4'
      : groups.length === 3
        ? 'xl:grid-cols-3'
        : groups.length === 2
          ? 'xl:grid-cols-2'
          : 'xl:grid-cols-1';

  return (
    <div className="mb-5 w-fit max-w-full rounded-2xl border border-border bg-muted/50 p-1.5 shadow-xs shadow-black/5 dark:border-transparent dark:bg-transparent dark:p-0 dark:shadow-none">
      <div className={cn('grid grid-cols-1 gap-1.5 sm:grid-cols-2', columnClassName)}>
        {groups.map((group) => {
          const isActive = activeStatusId === group.id;
          const tone = getStatusTone(group.id);

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={isActive}
              aria-label={`${isActive ? 'Clear' : 'Filter by'} ${group.label} projects`}
              onClick={() => onStatusClick(isActive ? undefined : group.id)}
              className={cn(
                'group min-h-[92px] rounded-xl border border-border bg-card p-3 text-left shadow-xs shadow-black/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-w-[280px]',
                'hover:-translate-y-px hover:bg-card hover:shadow-md',
                'dark:border-zinc-700/70 dark:bg-zinc-950/50 dark:shadow-none dark:hover:border-zinc-600/80 dark:hover:bg-zinc-950/70 dark:hover:shadow-none',
                tone.hover,
                isActive && 'ring-2',
                isActive && tone.active
              )}
            >
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        isActive ? tone.dot : group.dotClassName
                      )}
                    />
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.3px] text-label-light">
                      {group.label}
                    </span>
                  </div>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-xs dark:bg-foreground dark:text-background">
                      Selected
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="truncate text-[19px] font-semibold leading-none text-foreground">
                    {formatCurrency(group.totalContractValue)}
                  </div>
                  <div className="text-[12px] font-medium text-label-lighter">
                    {group.count} project{group.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
