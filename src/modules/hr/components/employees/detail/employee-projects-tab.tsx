import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { EmployeeProject } from '@/modules/hr/schemas/employee.schema';
import { Briefcase, CalendarDays, Hash, PanelRightOpen, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeProjectsTabProps {
  projects: EmployeeProject[] | undefined;
  isLoading: boolean;
}

function formatProjectDate(value: string | null | undefined) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function EmployeeProjectsTab({ projects, isLoading }: EmployeeProjectsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Assigned Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="min-w-0">
                      <Link
                        to={`/app/project/${project.id}/overview`}
                        className="break-words text-sm font-semibold text-foreground transition-colors group-hover:text-primary"
                      >
                        {project.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" appearance="light" size="sm">
                          {formatStatus(project.status)}
                        </Badge>
                        {project.isLead && (
                          <Badge variant="primary" appearance="light" size="sm">
                            Lead PM
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <Hash className="size-3.5 shrink-0" />
                        <span className="truncate">{project.jobNumber ?? 'No job #'}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <UserRound className="size-3.5 shrink-0" />
                        <span className="truncate">{project.role || 'Team Member'}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <Briefcase className="size-3.5 shrink-0" />
                        <span className="truncate">{project.gcName ?? 'No GC'}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <CalendarDays className="size-3.5 shrink-0" />
                        <span className="truncate">TCO {formatProjectDate(project.tcoDate)}</span>
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/project/${project.id}/overview`}>
                      Open
                      <PanelRightOpen className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              No projects assigned yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
