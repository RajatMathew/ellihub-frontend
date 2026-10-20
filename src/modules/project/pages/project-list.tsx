import { useCallback, useEffect, useMemo, useRef, useTransition, type Ref } from 'react';

import { ListPageHeader } from '@/app/components/page-header';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { useUrlSearch } from '@/app/hooks/use-url-search';
import { cn } from '@/app/lib/utils';
import { ProjectDivisionBoard } from '@/modules/project/components/project-division-board';
import { ProjectListEmptyState } from '@/modules/project/components/project-list-empty-state';
import { ProjectResultsLoading } from '@/modules/project/components/project-list-loading';
import { ProjectListTable } from '@/modules/project/components/project-list-table';
import { ProjectPortfolioToolbar } from '@/modules/project/components/project-portfolio-toolbar';
import { ProjectStatusSummary } from '@/modules/project/components/project-status-summary';
import {
  ProjectViewSwitcher,
  type ProjectPortfolioView,
} from '@/modules/project/components/project-view-switcher';
import { PROJECT_YEAR_TABS } from '@/modules/project/components/project-year-tabs';
import { PROJECT_STATUS_ORDER } from '@/modules/project/constants/project-form.constants';
import {
  getProjectListDefaultSortOrder,
  PROJECT_DIVISION_OPTIONS,
  PROJECT_LIST_DEFAULT_SORT_BY,
  PROJECT_LIST_SORT_FIELDS,
  type ProjectListSortBy,
  type ProjectListSortOrder,
} from '@/modules/project/constants/project.constants';
import { useInfiniteProjectsQuery, useProjectStatsQuery } from '@/modules/project/hooks';
import type { Division, ProjectStatusEnum } from '@/modules/project/schemas/project.schema';
import { Loader2, Plus } from 'lucide-react';

const parseProjectStatus = (value: string | null): ProjectStatusEnum | undefined => {
  if (!value) return undefined;
  return PROJECT_STATUS_ORDER.includes(value as ProjectStatusEnum)
    ? (value as ProjectStatusEnum)
    : undefined;
};

const parseProjectView = (value: string | null): ProjectPortfolioView =>
  value === 'list' ? 'list' : 'board';

const parseProjectDivision = (value: string | null): Division | undefined => {
  if (!value) return undefined;
  return PROJECT_DIVISION_OPTIONS.some((option) => option.value === value)
    ? (value as Division)
    : undefined;
};

const parseProjectSortBy = (value: string | null): ProjectListSortBy => {
  if (!value) return PROJECT_LIST_DEFAULT_SORT_BY;
  return PROJECT_LIST_SORT_FIELDS.includes(value as ProjectListSortBy)
    ? (value as ProjectListSortBy)
    : PROJECT_LIST_DEFAULT_SORT_BY;
};

const parseProjectSortOrder = (
  value: string | null,
  sortBy: ProjectListSortBy
): ProjectListSortOrder => {
  if (value === 'asc' || value === 'desc') return value;
  return getProjectListDefaultSortOrder(sortBy);
};

export function ProjectList() {
  const { searchParams, updateParams } = useUrlParamPatch();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [, startFilterTransition] = useTransition();

  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : null;
  const status = parseProjectStatus(searchParams.get('status') ?? searchParams.get('statusId'));
  const viewMode = parseProjectView(searchParams.get('view'));
  const division = parseProjectDivision(searchParams.get('division'));
  const sortBy = parseProjectSortBy(searchParams.get('sortBy'));
  const sortOrder = parseProjectSortOrder(searchParams.get('sortOrder'), sortBy);
  const defaultSortOrder = getProjectListDefaultSortOrder(sortBy);
  const hasSortOverride = sortBy !== PROJECT_LIST_DEFAULT_SORT_BY || sortOrder !== defaultSortOrder;
  // Filters re-render the whole board, so their URL changes go through a
  // transition and typing stays responsive.
  const updateParamsInTransition = useCallback(
    (patch: Record<string, string | undefined>) => {
      startFilterTransition(() => updateParams(patch));
    },
    [updateParams]
  );
  const search = useUrlSearch({ searchParams, updateParams: updateParamsInTransition });
  const searchQuery = search.query.trim();
  const hasProjectListFilters = Boolean(searchQuery || division || hasSortOverride);
  const listParams = useMemo(
    () => ({
      size: 100,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
      division,
      year: year ?? undefined,
      status,
    }),
    [division, searchQuery, sortBy, sortOrder, status, year]
  );
  const statsParams = useMemo(
    () => ({
      search: searchQuery || undefined,
      division,
      year: year ?? undefined,
      status,
    }),
    [division, searchQuery, status, year]
  );

  const projectsQuery = useInfiniteProjectsQuery(listParams);
  const statsQuery = useProjectStatsQuery(statsParams);
  const hasProjectsData = projectsQuery.data !== undefined;
  const hasStatsData = statsQuery.data !== undefined;
  const showProjectsInitialLoader =
    projectsQuery.isLoading || (projectsQuery.isFetching && !hasProjectsData);
  // After a filter change (year, status, division, search, sort) both queries
  // keep the previous filter's data on screen until the new answer arrives
  // (keepPreviousData). That data belongs to another filter — last year's
  // projects under this year's tab — so the results and the status cards show
  // their skeletons instead, like the first load. Only a background refetch of
  // the same filter keeps its data and gets the small Refreshing badge.
  const isLoadingFilteredProjects = projectsQuery.isPlaceholderData;
  const showStatusSummaryLoader =
    statsQuery.isLoading ||
    (statsQuery.isFetching && !hasStatsData) ||
    statsQuery.isPlaceholderData;
  const isRefreshingProjects =
    hasProjectsData &&
    projectsQuery.isFetching &&
    !projectsQuery.isFetchingNextPage &&
    !isLoadingFilteredProjects;
  const isRefreshingStats = hasStatsData && statsQuery.isFetching && !statsQuery.isPlaceholderData;
  const isRefreshingPortfolio =
    !showProjectsInitialLoader && (isRefreshingProjects || isRefreshingStats);

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
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !projectsQuery.isFetching &&
          !projectsQuery.isFetchingNextPage
        ) {
          void projectsQuery.fetchNextPage();
        }
      },
      { rootMargin: '360px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    projectsQuery.fetchNextPage,
    projectsQuery.hasNextPage,
    projectsQuery.isFetching,
    projectsQuery.isFetchingNextPage,
  ]);

  const updateSortParams = useCallback(
    (nextSortBy: ProjectListSortBy, nextSortOrder: ProjectListSortOrder) => {
      const nextDefaultSortOrder = getProjectListDefaultSortOrder(nextSortBy);

      updateParams({
        sortBy: nextSortBy === PROJECT_LIST_DEFAULT_SORT_BY ? undefined : nextSortBy,
        sortOrder: nextSortOrder === nextDefaultSortOrder ? undefined : nextSortOrder,
      });
    },
    [updateParams]
  );

  const handleYearChange = useCallback(
    (y: number | null) => {
      startFilterTransition(() => {
        updateParams({
          year: y === null ? undefined : String(y),
          status: undefined,
          statusId: undefined,
        });
      });
    },
    [startFilterTransition, updateParams]
  );

  const handleStatusClick = useCallback(
    (id: string | undefined) => {
      startFilterTransition(() => {
        updateParams({ status: id, statusId: undefined });
      });
    },
    [startFilterTransition, updateParams]
  );

  const handleViewChange = useCallback(
    (nextView: ProjectPortfolioView) => {
      startFilterTransition(() => {
        updateParams({ view: nextView === 'board' ? undefined : nextView });
      });
    },
    [startFilterTransition, updateParams]
  );

  const handleDivisionChange = useCallback(
    (nextDivision: Division | undefined) => {
      startFilterTransition(() => {
        updateParams({ division: nextDivision });
      });
    },
    [startFilterTransition, updateParams]
  );

  const handleSortByChange = useCallback(
    (nextSortBy: ProjectListSortBy) => {
      startFilterTransition(() => {
        updateSortParams(nextSortBy, getProjectListDefaultSortOrder(nextSortBy));
      });
    },
    [startFilterTransition, updateSortParams]
  );

  const handleSortOrderChange = useCallback(
    (nextSortOrder: ProjectListSortOrder) => {
      startFilterTransition(() => {
        updateSortParams(sortBy, nextSortOrder);
      });
    },
    [sortBy, startFilterTransition, updateSortParams]
  );

  const handleClearProjectListFilters = useCallback(() => {
    // The search goes in the same URL change as the other filters.
    search.discard();
    updateParamsInTransition({
      search: undefined,
      division: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  }, [search, updateParamsInTransition]);

  return (
    <div className="container-fluid py-7.5">
      <ListPageHeader
        title="Project Portfolio"
        leadingActions={<ProjectViewSwitcher value={viewMode} onValueChange={handleViewChange} />}
        actions={[
          {
            label: 'New Project',
            icon: Plus,
            to: 'new',
            placement: 'primary',
            enabled: { resource: 'project', action: 'create' },
          },
        ]}
        tabs={{
          items: PROJECT_YEAR_TABS,
          ariaLabel: 'Project year filters',
          activeValue: year,
          onValueChange: (value) => handleYearChange(value as number | null),
        }}
      />

      {(showStatusSummaryLoader || (statsQuery.data?.statusSummary.length ?? 0) > 0) && (
        <ProjectStatusSummary
          items={statsQuery.data?.statusSummary ?? []}
          isLoading={showStatusSummaryLoader}
          activeStatusId={status}
          onStatusClick={handleStatusClick}
        />
      )}

      {/* Mounted through loading and errors alike, so the search box never
          drops what is being typed. */}
      <ProjectPortfolioToolbar
        searchInput={search.input}
        division={division}
        sortBy={sortBy}
        sortOrder={sortOrder}
        totalProjects={
          showProjectsInitialLoader || isLoadingFilteredProjects || projectsQuery.isError
            ? undefined
            : totalProjects
        }
        hasActiveFilters={hasProjectListFilters}
        onSearchChange={search.setInput}
        onSearchClear={search.clear}
        onDivisionChange={handleDivisionChange}
        onSortByChange={handleSortByChange}
        onSortOrderChange={handleSortOrderChange}
        onClear={handleClearProjectListFilters}
      />

      <ProjectListRefreshIndicator isVisible={isRefreshingPortfolio} />

      {showProjectsInitialLoader || isLoadingFilteredProjects ? (
        <ProjectResultsLoading viewMode={viewMode} />
      ) : projectsQuery.isError ? (
        <QueryErrorState
          title="Unable to load projects"
          onRetry={() => {
            void projectsQuery.refetch();
            void statsQuery.refetch();
          }}
        />
      ) : hasProjects ? (
        <>
          {viewMode === 'board' ? (
            <ProjectDivisionBoard
              projects={projects}
              divisionSummary={statsQuery.data?.divisionSummary}
            />
          ) : (
            <ProjectListTable projects={projects} />
          )}
          <ProjectListLoadMore
            ref={loadMoreRef}
            loadedCount={projects.length}
            totalCount={totalProjects}
            hasNextPage={Boolean(projectsQuery.hasNextPage)}
            isFetchingNextPage={projectsQuery.isFetchingNextPage}
          />
        </>
      ) : (
        <ProjectListEmptyState year={year} searchQuery={searchQuery} onClearSearch={search.clear} />
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

function ProjectListRefreshIndicator({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed top-24 right-6 z-30 transition-opacity duration-150',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      aria-live="polite"
      aria-hidden={!isVisible}
    >
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Refreshing
      </span>
    </div>
  );
}
