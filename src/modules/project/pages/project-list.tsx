import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type Ref } from 'react';

import { ListPageHeader } from '@/app/components/page-header';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { cn } from '@/app/lib/utils';
import { ProjectDivisionBoard } from '@/modules/project/components/project-division-board';
import { ProjectListControls } from '@/modules/project/components/project-list-controls';
import { ProjectListEmptyState } from '@/modules/project/components/project-list-empty-state';
import { ProjectListLoading } from '@/modules/project/components/project-list-loading';
import { ProjectListTable } from '@/modules/project/components/project-list-table';
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
  const [isFilterPending, startFilterTransition] = useTransition();

  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : null;
  const status = parseProjectStatus(searchParams.get('status') ?? searchParams.get('statusId'));
  const viewMode = parseProjectView(searchParams.get('view'));
  const searchQuery = (searchParams.get('search') ?? '').trim();
  const division = parseProjectDivision(searchParams.get('division'));
  const sortBy = parseProjectSortBy(searchParams.get('sortBy'));
  const sortOrder = parseProjectSortOrder(searchParams.get('sortOrder'), sortBy);
  const defaultSortOrder = getProjectListDefaultSortOrder(sortBy);
  const hasSortOverride = sortBy !== PROJECT_LIST_DEFAULT_SORT_BY || sortOrder !== defaultSortOrder;
  const hasProjectListFilters = Boolean(searchQuery || division || hasSortOverride);
  const showProjectListControls = viewMode === 'list' || hasProjectListFilters;
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const debouncedUpdateSearch = useDebouncedCallback((value: string) => {
    startFilterTransition(() => {
      updateParams({ search: value || undefined });
    });
  }, 300);
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
  const showStatusSummaryLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const isRefreshingProjects =
    hasProjectsData && projectsQuery.isFetching && !projectsQuery.isFetchingNextPage;
  const isRefreshingStats = hasStatsData && statsQuery.isFetching;
  const isRefreshingPortfolio =
    !showProjectsInitialLoader && (isFilterPending || isRefreshingProjects || isRefreshingStats);

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncedUpdateSearch(value.trim());
    },
    [debouncedUpdateSearch]
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
    setSearchInput('');
    debouncedUpdateSearch('');
    startFilterTransition(() => {
      updateParams({
        search: undefined,
        division: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });
  }, [debouncedUpdateSearch, startFilterTransition, updateParams]);

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

      {showProjectsInitialLoader ? (
        <ProjectListLoading viewMode={viewMode} />
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
          {(showStatusSummaryLoader || (statsQuery.data?.statusSummary.length ?? 0) > 0) && (
            <ProjectStatusSummary
              items={statsQuery.data?.statusSummary ?? []}
              isLoading={showStatusSummaryLoader}
              activeStatusId={status}
              onStatusClick={handleStatusClick}
            />
          )}

          {showProjectListControls && (
            <ProjectListControls
              searchInput={searchInput}
              division={division}
              sortBy={sortBy}
              sortOrder={sortOrder}
              hasActiveFilters={hasProjectListFilters}
              onSearchChange={handleSearchChange}
              onDivisionChange={handleDivisionChange}
              onSortByChange={handleSortByChange}
              onSortOrderChange={handleSortOrderChange}
              onClear={handleClearProjectListFilters}
            />
          )}

          <ProjectListRefreshIndicator isVisible={isRefreshingPortfolio} />

          {hasProjects ? (
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
