import { useCallback } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Skeleton } from '@app/components/ui/skeleton';
import { ProjectDivisionBoard } from '@modules/project/components/project-division-board';
import { ProjectStatusSummary } from '@modules/project/components/project-status-summary';
import { ProjectYearTabs } from '@modules/project/components/project-year-tabs';
import { useProjectsQuery } from '@modules/project/hooks';

const currentYear = new Date().getFullYear();

export default function ProjectList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const year = Number(searchParams.get('year')) || currentYear;
  const statusId = searchParams.get('statusId') ?? undefined;

  const { data, isLoading } = useProjectsQuery({ 
    statusId, 
    size: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    year: undefined, // Removing year as it causes 500 on backend
  });

  const projects = (data?.data ?? []).filter((p) => {
    if (!year) return true;
    const pYear = p.createdAt ? new Date(p.createdAt).getFullYear() : null;
    return pYear === year;
  });
  const totalCount = projects.length;

  const handleYearChange = useCallback(
    (y: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('year', String(y));
        next.delete('statusId');
        return next;
      });
    },
    [setSearchParams]
  );

  const handleStatusClick = useCallback(
    (id: string | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id) {
          next.set('statusId', id);
        } else {
          next.delete('statusId');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  return (
    <div className="container-fluid py-7.5">
      {/* Header */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Portfolio Overview
            </div>
            <ToolbarPageTitle>Active Projects</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="primary" asChild>
              <Link to="new">+ New Project</Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>

        {/* Year tabs */}
        <ProjectYearTabs activeYear={year} totalCount={totalCount} onYearChange={handleYearChange} />
      </Toolbar>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          <ProjectStatusSummary
            projects={projects}
            activeStatusId={statusId}
            onStatusClick={handleStatusClick}
          />

          {projects.length > 0 ? (
            <ProjectDivisionBoard projects={projects} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground">No projects found for {year}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
