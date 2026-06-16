import { type Ref, useCallback, useEffect, useMemo, useRef } from 'react';

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
import { useInfiniteProjectsQuery, useProjectStatsQuery } from '@/modules/project/hooks';
import type { ProjectStatusEnum } from '@/modules/project/schemas/project.schema';
import { Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const PROJECT_STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED', 'COMPLETED'] as const;

const parseProjectStatus = (value: string | null): ProjectStatusEnum | undefined => {
  if (!value) return undefined;
  return PROJECT_STATUSES.includes(value as ProjectStatusEnum)
    ? (value as ProjectStatusEnum)
    : undefined;
};

export function ProjectList() {
  const { can } = useAccess();
  const { searchParams, updateParams } = useUrlParamPatch();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : null;
  const status = parseProjectStatus(searchParams.get('status') ?? searchParams.get('statusId'));

  const listParams = useMemo(
    () => ({
      size: 100,
      sortBy: 'tcoDate',
      sortOrder: 'desc' as const,
      year: year ?? undefined,
      status,
    }),
    [status, year]
  );
  const statsParams = useMemo(
    () => ({
      year: year ?? undefined,
      status,
    }),
    [status, year]
  );

  const projectsQuery = useInfiniteProjectsQuery(listParams);
  const statsQuery = useProjectStatsQuery(statsParams);

  const projects = useMemo(
    () => projectsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [projectsQuery.data?.pages]
  );
  const totalProjects =
    projectsQuery.data?.pages[0]?.pagination.totalItems ?? statsQuery.data?.totalProjects ?? 0;
  const hasProjects = projects.length > 0;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !projectsQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !projectsQuery.isFetchingNextPage) {
          void projectsQuery.fetchNextPage();
        }
      },
      { rootMargin: '360px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [projectsQuery.fetchNextPage, projectsQuery.hasNextPage, projectsQuery.isFetchingNextPage]);

  const handleYearChange = useCallback(
    (y: number | null) => {
      updateParams({
        year: y === null ? undefined : String(y),
        status: undefined,
        statusId: undefined,
      });
    },
    [updateParams]
  );

  const handleStatusClick = useCallback(
    (id: string | undefined) => {
      updateParams({ status: id, statusId: undefined });
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

      {projectsQuery.isLoading ? (
        <ProjectListLoading />
      ) : projectsQuery.isError ? (
        <QueryErrorState
          title="Unable to load projects"
          onRetry={() => {
            void projectsQuery.refetch();
            void statsQuery.refetch();
          }}
        />
      ) : (
        <>
          {(statsQuery.data?.statusSummary.length ?? 0) > 0 && (
            <ProjectStatusSummary
              items={statsQuery.data?.statusSummary ?? []}
              activeStatusId={status}
              onStatusClick={handleStatusClick}
            />
          )}

          {hasProjects ? (
            <>
              <ProjectDivisionBoard
                projects={projects}
                divisionSummary={statsQuery.data?.divisionSummary}
              />
              <ProjectListLoadMore
                ref={loadMoreRef}
                loadedCount={projects.length}
                totalCount={totalProjects}
                hasNextPage={Boolean(projectsQuery.hasNextPage)}
                isFetchingNextPage={projectsQuery.isFetchingNextPage}
              />
            </>
          ) : (
            <ProjectListEmptyState year={year} />
          )}
        </>
      )}
    </div>
  );
}

export default ProjectList;

interface ProjectListLoadMoreProps {
  loadedCount: number;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

function ProjectListLoadMore({
  ref,
  loadedCount,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
}: ProjectListLoadMoreProps & { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="flex min-h-14 items-center justify-center px-4 py-5 text-xs">
      {isFetchingNextPage ? (
        <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading more projects
        </span>
      ) : (
        <span className="font-medium text-muted-foreground">
          {hasNextPage
            ? `Loaded ${loadedCount} of ${totalCount} projects`
            : `Showing ${loadedCount} of ${totalCount} projects`}
        </span>
      )}
    </div>
  );
}
