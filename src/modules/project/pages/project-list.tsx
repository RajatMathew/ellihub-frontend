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

const getProjectYearDate = (project: ProjectListItem): string | null | undefined => {
  return project.tcoDate ?? project.estimatedEndDate;
};

const getProjectYear = (project: ProjectListItem): number | null => {
  const projectYearDate = getProjectYearDate(project);
  if (!projectYearDate) return null;

  const year = Number.parseInt(projectYearDate.slice(0, 4), 10);
  return Number.isInteger(year) ? year : null;
};

const getProjectYearSortValue = (project: ProjectListItem): number => {
  const projectYearDate = getProjectYearDate(project);
  if (!projectYearDate) return 0;

  const value = new Date(projectYearDate).getTime();
  return Number.isFinite(value) ? value : 0;
};

const getProjectStatusId = (project: ProjectListItem): string | undefined => {
  return project.statusRef?.id ?? project.status ?? undefined;
};

export function ProjectList() {
  const { can } = useAccess();
  const { searchParams, updateParams } = useUrlParamPatch();

  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : null;
  const statusId = searchParams.get('statusId') ?? undefined;

  const { data, isLoading, isError, refetch } = useProjectsQuery({
    size: 100,
    sortBy: 'tcoDate',
    sortOrder: 'desc',
    year: year ?? undefined,
  });

  const summaryProjects = useMemo(
    () =>
      (data?.data ?? [])
        .filter((project) => year === null || getProjectYear(project) === year)
        .sort((a, b) => getProjectYearSortValue(b) - getProjectYearSortValue(a)),
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

  const handleYearChange = useCallback(
    (y: number | null) => {
      updateParams({ year: y === null ? undefined : String(y), statusId: undefined });
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
      <Toolbar className="gap-3 pt-5 pb-3 mb-4">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-0 lg:gap-0">
            <ToolbarPageTitle>Project Portfolio</ToolbarPageTitle>
          </ToolbarHeading>
          {can('project', 'create') && (
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

        <ProjectYearTabs activeYear={year} onYearChange={handleYearChange} />
      </Toolbar>

      {isLoading ? (
        <ProjectListLoading />
      ) : isError ? (
        <QueryErrorState title="Unable to load projects" onRetry={() => void refetch()} />
      ) : (
        <>
          {summaryProjects.length > 0 && (
            <ProjectStatusSummary
              projects={summaryProjects}
              activeStatusId={statusId}
              onStatusClick={handleStatusClick}
            />
          )}

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
