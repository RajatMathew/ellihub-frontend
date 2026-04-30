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

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const originalContractValue = project.contractValue ?? project.primeContract?.contractValue ?? 0;
  const approvedChangeOrdersTotal = project.approvedChangeOrdersTotal ?? 0;
  const revisedContractValue =
    project.revisedContractValue ?? originalContractValue + approvedChangeOrdersTotal;
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
          <div className="flex items-center gap-2">
            <Progress value={0} className="flex-1" indicatorClassName="bg-success" />
            <span className="text-xs text-muted-foreground shrink-0">0%</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
