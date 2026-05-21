import { useCallback, useMemo } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { ProjectDivisionBoard } from '@/modules/project/components/project-division-board';
import { ProjectListEmptyState } from '@/modules/project/components/project-list-empty-state';
import { ProjectListLoading } from '@/modules/project/components/project-list-loading';
import { ProjectStatusSummary } from '@/modules/project/components/project-status-summary';
import { ProjectYearTabs } from '@/modules/project/components/project-year-tabs';
import { useProjectsQuery } from '@/modules/project/hooks';
import type { ProjectListItem } from '@/modules/project/schemas/project.schema';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

const getProjectYear = (project: ProjectListItem): number | null => {
  if (!project.estimatedEndDate) return null;

  const year = Number.parseInt(project.estimatedEndDate.slice(0, 4), 10);
  return Number.isInteger(year) ? year : null;
};

const getProjectStatusId = (project: ProjectListItem): string | undefined => {
  return project.statusRef?.id ?? project.status ?? undefined;
};

export function ProjectList() {
  const { isAdmin } = useAccess();
  const { searchParams, updateParams } = useUrlParamPatch();

  const year = Number(searchParams.get('year')) || currentYear;
  const statusId = searchParams.get('statusId') ?? undefined;

  const { data, isLoading, isError, refetch } = useProjectsQuery({
    size: 100,
    sortBy: 'estimatedEndDate',
    sortOrder: 'desc',
    year,
  });

  const summaryProjects = useMemo(
    () => (data?.data ?? []).filter((project) => getProjectYear(project) === year),
    [data?.data, year]
  );
  const projects = useMemo(
    () =>
      summaryProjects.filter((project) => {
        if (!statusId) return true;

        return getProjectStatusId(project) === statusId;
      }),
    [summaryProjects, statusId]
  );

  const totalCount = data?.pagination.totalItems ?? summaryProjects.length;

  const handleYearChange = useCallback(
    (y: number) => {
      updateParams({ year: String(y), statusId: undefined });
    },
    [updateParams]
  );

  const handleStatusClick = useCallback(
    (id: string | undefined) => {
      updateParams({ statusId: id });
    },
    [updateParams]
  );

  return (
    <div className="container-fluid py-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Portfolio Overview
            </div>
            <ToolbarPageTitle>Active Projects</ToolbarPageTitle>
          </ToolbarHeading>
          {isAdmin && (
            <ToolbarActions>
              <Button variant="primary" asChild>
                <Link to="new">
                  <Plus className="size-4" />
                  New Project
                </Link>
              </Button>
            </ToolbarActions>
          )}
        </ToolbarWrapper>

        <ProjectYearTabs
          activeYear={year}
          totalCount={totalCount}
          onYearChange={handleYearChange}
        />
      </Toolbar>

      {isLoading ? (
        <ProjectListLoading />
      ) : isError ? (
        <QueryErrorState title="Unable to load projects" onRetry={() => void refetch()} />
      ) : (
        <>
          <ProjectStatusSummary
            projects={summaryProjects}
            activeStatusId={statusId}
            onStatusClick={handleStatusClick}
          />

          {projects.length > 0 ? (
            <ProjectDivisionBoard projects={projects} />
          ) : (
            <ProjectListEmptyState year={year} />
          )}
        </>
      )}
    </div>
  );
}

export default ProjectList;
