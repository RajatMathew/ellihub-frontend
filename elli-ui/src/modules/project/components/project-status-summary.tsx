import { useMemo } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import type { ProjectListItem } from '@/modules/project/schemas/project.schema';

interface StatusGroup {
  id: string;
  label: string;
  dotClassName: string;
  total: number;
  count: number;
}

interface ProjectStatusSummaryProps {
  projects: ProjectListItem[];
  activeStatusId?: string;
  onStatusClick: (id: string | undefined) => void;
}

const STATUS_DOT_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-warning',
  CLOSED: 'bg-muted-foreground',
  COMPLETED: 'bg-primary',
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

const getProjectContractSum = (project: ProjectListItem): number => {
  const originalContractValue = project.contractValue ?? project.primeContract?.contractValue ?? 0;
  const approvedChangeOrdersTotal = project.approvedChangeOrdersTotal ?? 0;

  return project.revisedContractValue ?? originalContractValue + approvedChangeOrdersTotal;
};

export function ProjectStatusSummary({
  projects,
  activeStatusId,
  onStatusClick,
}: ProjectStatusSummaryProps) {
  const groups = useMemo(() => {
    const map = new Map<string, StatusGroup>();

    for (const project of projects) {
      const status = project.statusRef ?? project.status;
      if (!status) continue;

      let id: string;
      let label: string;
      let dotClassName: string;

      if (typeof status === 'string') {
        id = status;
        label = STATUS_LABELS[id] ?? id;
        dotClassName = getStatusDotClassName(id);
      } else {
        id = status.id;
        label = status.label || status.name || 'Unknown';
        dotClassName = getStatusDotClassName(status.name ?? status.label ?? status.id);
      }

      const existing = map.get(id);
      const value = getProjectContractSum(project);

      if (existing) {
        existing.total += value;
        existing.count += 1;
      } else {
        map.set(id, { id, label, dotClassName, total: value, count: 1 });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {groups.map((group) => {
        const isActive = activeStatusId === group.id;

        return (
          <button
            key={group.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onStatusClick(isActive ? undefined : group.id)}
            className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                isActive && 'ring-2 ring-primary'
              )}
            >
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn('size-2.5 shrink-0 rounded-full', group.dotClassName)} />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <p className="text-lg font-semibold">{formatCurrency(group.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {group.count} project{group.count !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
