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
import { Card } from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { useAccess } from '@/app/contexts/access-context';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { ProjectDivisionBoard } from '@/modules/project/components/project-division-board';
import { ProjectListEmptyState } from '@/modules/project/components/project-list-empty-state';
import { ProjectListLoading } from '@/modules/project/components/project-list-loading';
import { ProjectStatusSummary } from '@/modules/project/components/project-status-summary';
import { ProjectYearTabs } from '@/modules/project/components/project-year-tabs';
import { useInfiniteProjectsQuery, useProjectStatsQuery } from '@/modules/project/hooks';
import { getProjectStageSwatchClassName } from '@/modules/project/lib/project-stage-colors';
import type {
  ProjectListItem,
  ProjectStatusEnum,
} from '@/modules/project/schemas/project.schema';
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
  const [view, setView] = useViewMode<'board' | 'list'>('projects', 'board');

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

        <div className="flex items-center justify-between gap-3">
          <ProjectYearTabs activeYear={year} onYearChange={handleYearChange} />
          <ViewSwitcher
            views={[
              { key: 'board', label: 'Board' },
              { key: 'list', label: 'List' },
            ]}
            active={view}
            onChange={setView}
          />
        </div>
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
              {view === 'board' && (
                <ProjectDivisionBoard
                  projects={projects}
                  divisionSummary={statsQuery.data?.divisionSummary}
                />
              )}
              {view === 'list' && <ProjectFlatList projects={projects} />}
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

const formatListDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const formatListBalance = (value: number): string => {
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(value);
};

function ProjectFlatList({ projects }: { projects: ProjectListItem[] }) {
  return (
    <Card className="overflow-hidden rounded-none border-zinc-300/70 bg-background shadow-none dark:border-zinc-600/80">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-b border-zinc-300/80 bg-[#1a3a5f] hover:bg-[#1a3a5f] dark:border-zinc-600/80">
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Job #
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Project
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Stage
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Division
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              GC
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Lead PM
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-right text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              TCO Date
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-right text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Total Cost
            </TableCell>
            <TableCell className="h-10 px-4 py-0 text-right text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#E0A94D]">
              Balance
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const stageLabel = project.stage?.label ?? project.stage?.name ?? '';
            const stageDotClass = getProjectStageSwatchClassName(stageLabel);
            const totalSpent = project.totalSpent ?? 0;
            const budgetRemaining = project.budgetRemaining ?? 0;
            const balanceNegative = budgetRemaining < 0;

            return (
              <TableRow
                key={project.id}
                className="group border-b border-zinc-200/80 transition-colors hover:bg-[#f1ece2] dark:border-zinc-700/60 dark:hover:bg-zinc-900/40"
              >
                <TableCell className="h-12 p-0 align-middle" colSpan={9}>
                  <Link
                    to={`/app/project/${project.id}/overview`}
                    className="grid h-12 w-full grid-cols-[7rem_minmax(0,2.4fr)_10rem_8rem_minmax(0,1.4fr)_minmax(0,1.2fr)_7rem_8rem_8rem] items-center gap-0 px-0 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a3a5f]"
                  >
                    <span className="truncate px-4 text-sm font-medium tabular-nums text-foreground">
                      {project.jobNumber ?? '—'}
                    </span>
                    <span className="truncate px-4 text-sm font-semibold text-foreground">
                      {project.name}
                    </span>
                    <span className="flex items-center gap-2 px-4">
                      {stageLabel ? (
                        <>
                          <span
                            className={cn('size-1.5 rounded-[2px]', stageDotClass)}
                            aria-hidden="true"
                          />
                          <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-foreground/80">
                            {stageLabel}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </span>
                    <span className="truncate px-4 text-xs font-medium text-foreground/80">
                      {project.division?.name ?? '—'}
                    </span>
                    <span className="truncate px-4 text-xs font-medium text-foreground/80">
                      {project.gc?.name ?? '—'}
                    </span>
                    <span className="truncate px-4 text-xs font-medium text-foreground/80">
                      {project.leadPM?.name ?? '—'}
                    </span>
                    <span className="px-4 text-right text-xs font-medium tabular-nums text-foreground/80">
                      {formatListDate(project.tcoDate)}
                    </span>
                    <span className="px-4 text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(totalSpent)}
                    </span>
                    <span
                      className={cn(
                        'px-4 text-right text-sm font-semibold tabular-nums',
                        balanceNegative ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {formatListBalance(budgetRemaining)}
                    </span>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

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
