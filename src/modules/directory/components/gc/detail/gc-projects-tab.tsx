import type { ReactNode } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type { GCProject } from '@/modules/directory/schemas/gc.schema';
import { Building2, CalendarDays, ExternalLink, FolderOpen, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getProjectMetricsFromProjects } from './gc-project-metrics';

interface GCProjectsTabProps {
  projects: GCProject[];
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  CLOSED: 'Closed',
  COMPLETED: 'Completed',
};

const PROJECT_STATUS_VARIANTS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  CLOSED: 'info',
  COMPLETED: 'primary',
};

export function GCProjectsTab({ projects }: GCProjectsTabProps) {
  const { activeProjects, totalCommitted } = getProjectMetricsFromProjects(projects);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Project Section
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeProjects} active of {projects.length} linked projects
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Active Committed
          </div>
          <div className="text-lg font-semibold text-foreground">
            {formatCurrency(totalCommitted)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <FolderOpen className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No linked projects</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Projects assigned to this general contractor will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectRow({ project }: { project: GCProject }) {
  const status = project.status.toUpperCase();
  const location = [project.city, project.state].filter(Boolean).join(', ');
  const dateRange = formatProjectDateRange(project);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to={`/app/project/${project.id}/overview`}
            className="min-w-0 break-words text-sm font-semibold text-foreground hover:text-primary"
          >
            {project.name}
          </Link>
          <Badge
            variant={PROJECT_STATUS_VARIANTS[status] ?? 'secondary'}
            appearance="outline"
            size="sm"
            className="w-fit shrink-0"
          >
            {PROJECT_STATUS_LABELS[status] ?? project.status}
          </Badge>
        </div>

        <div className="grid min-w-0 gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <ProjectMeta icon={<Building2 className="size-4" />}>
            {project.jobNumber || 'No job number'}
          </ProjectMeta>
          <ProjectMeta icon={<MapPin className="size-4" />}>{location || 'No location'}</ProjectMeta>
          <ProjectMeta icon={<CalendarDays className="size-4" />}>{dateRange}</ProjectMeta>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-4 sm:shrink-0 sm:flex-col sm:items-end">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Contract
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(project.contractValue)}
          </div>
        </div>
        <Link
          to={`/app/project/${project.id}/overview`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
          aria-label={`Open ${project.name}`}
        >
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function ProjectMeta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function formatProjectDateRange(project: GCProject) {
  if (!project.estimatedStartDate && !project.estimatedEndDate) {
    return 'No dates';
  }

  const start = project.estimatedStartDate
    ? formatDate(project.estimatedStartDate, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';
  const end = project.estimatedEndDate
    ? formatDate(project.estimatedEndDate, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';

  return `${start} - ${end}`;
}
