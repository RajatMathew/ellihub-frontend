import { useMemo } from 'react';

import { Card, CardContent } from '@app/components/ui/card';
import { formatCurrency } from '@app/lib/helpers';
import { cn } from '@app/lib/utils';

import type { ProjectListItem } from '@modules/project/schemas/project.schema';

interface StatusGroup {
  id: string;
  label: string;
  color: string;
  total: number;
  count: number;
}

interface ProjectStatusSummaryProps {
  projects: ProjectListItem[];
  activeStatusId?: string;
  onStatusClick: (id: string | undefined) => void;
}

export function ProjectStatusSummary({
  projects,
  activeStatusId,
  onStatusClick,
}: ProjectStatusSummaryProps) {
  const groups = useMemo(() => {
    const map = new Map<string, StatusGroup>();

    for (const project of projects) {
      if (!project.status) continue;
      const { id, label, color } = project.status;
      const existing = map.get(id);
      const value = project.primeContract?.contractValue ?? 0;

      if (existing) {
        existing.total += value;
        existing.count += 1;
      } else {
        map.set(id, { id, label, color, total: value, count: 1 });
      }
    }

    // Sort by status order if available, otherwise by label
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {groups.map((group) => {
        const isActive = activeStatusId === group.id;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onStatusClick(isActive ? undefined : group.id)}
            className="text-left"
          >
            <Card
              className={cn(
                'transition-shadow cursor-pointer hover:shadow-md',
                isActive && 'ring-2 ring-primary',
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
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
