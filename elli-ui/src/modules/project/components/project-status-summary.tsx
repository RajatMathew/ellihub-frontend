import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from '@/modules/project/constants/project-form.constants';
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
  isLoading?: boolean;
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
    active: 'border-card-border-hover bg-muted/45 ring-1 ring-inset ring-foreground/10',
    dot: 'bg-success',
    hover: 'hover:border-foreground/20',
  },
  INACTIVE: {
    active: 'border-card-border-hover bg-muted/45 ring-1 ring-inset ring-foreground/10',
    dot: 'bg-warning',
    hover: 'hover:border-foreground/20',
  },
  CLOSED: {
    active: 'border-card-border-hover bg-muted/45 ring-1 ring-inset ring-foreground/10',
    dot: 'bg-muted-foreground',
    hover: 'hover:border-foreground/20',
  },
  COMPLETED: {
    active: 'border-card-border-hover bg-muted/45 ring-1 ring-inset ring-foreground/10',
    dot: 'bg-primary',
    hover: 'hover:border-foreground/20',
  },
};

const getStatusDotClassName = (value: string): string => {
  return STATUS_DOT_CLASSES[value.toUpperCase()] ?? 'bg-primary';
};

const getStatusTone = (value: string) => {
  return (
    STATUS_FILTER_TONE_CLASSES[value.toUpperCase()] ?? {
      active: 'border-card-border-hover bg-muted/45 ring-1 ring-inset ring-foreground/10',
      dot: getStatusDotClassName(value),
      hover: 'hover:border-foreground/20',
    }
  );
};

export function ProjectStatusSummary({
  items,
  isLoading = false,
  activeStatusId,
  onStatusClick,
}: ProjectStatusSummaryProps) {
  if (isLoading) return <ProjectStatusSummarySkeleton />;

  const itemByStatus = new Map(items.map((item) => [item.id, item]));
  const groups: StatusGroup[] = PROJECT_STATUS_ORDER.map((status) => {
    const item = itemByStatus.get(status);

    return {
      id: status,
      label: item?.label || PROJECT_STATUS_LABELS[status],
      dotClassName: getStatusDotClassName(status),
      totalContractValue: item?.totalContractValue ?? 0,
      count: item?.count ?? 0,
    };
  });

  return (
    <div className="mb-5 w-full max-w-full rounded-2xl border border-card-border bg-muted/50 p-1.5 shadow-xs shadow-black/5">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
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
                'group relative min-h-[88px] min-w-0 overflow-hidden rounded-xl border border-card-border bg-card p-2.5 text-left shadow-xs shadow-black/5 transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[92px] sm:p-3',
                'hover:-translate-y-px hover:bg-card hover:shadow-md',
                tone.hover,
                isActive && tone.active
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-3 left-0 w-0.5 rounded-r bg-transparent transition-colors',
                  isActive && tone.dot
                )}
              />
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
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
                </div>

                <div className="space-y-0.5">
                  <div className="truncate text-base font-semibold leading-none text-foreground sm:text-[19px]">
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

function ProjectStatusSummarySkeleton() {
  return (
    <div className="mb-5 w-full max-w-full rounded-2xl border border-card-border bg-muted/50 p-1.5 shadow-xs shadow-black/5">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`project-status-loader-${index}`}
            className="min-h-[88px] min-w-0 rounded-xl border border-card-border bg-card p-2.5 shadow-xs shadow-black/5 sm:min-h-[92px] sm:p-3"
          >
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Skeleton className="size-2.5 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
