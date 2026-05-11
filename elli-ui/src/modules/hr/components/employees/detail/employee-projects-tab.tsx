import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { EmployeeProject } from '@/modules/hr/schemas/employee.schema';
import { Briefcase, PanelRightOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeProjectsTabProps {
  projects: EmployeeProject[] | undefined;
  isLoading: boolean;
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
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="break-words text-sm font-semibold uppercase tracking-tight transition-colors group-hover:text-primary">
                    {project.name}
                  </span>
                  <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                    {project.status}
                  </span>
                </div>
                <Button variant="ghost" size="xs" mode="icon" asChild>
                  <Link to={`/app/project/${project.id}`} aria-label={`Open ${project.name}`}>
                    <PanelRightOpen className="size-3.5" />
                  </Link>
                </Button>
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
