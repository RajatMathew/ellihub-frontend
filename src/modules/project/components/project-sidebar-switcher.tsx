import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useProjectNavigation } from '@/app/hooks/use-project-hook';
import { cn } from '@/app/lib/utils';
import { useInfiniteProjectOptionsQuery, useProjectDetailQuery } from '@/modules/project/hooks';
import type { ProjectDetail, ProjectOption } from '@/modules/project/schemas/project.schema';
import { ChevronsUpDown, Loader2, X } from 'lucide-react';

type ProjectSwitcherProject = Pick<ProjectOption | ProjectDetail, 'id' | 'name'> & {
  jobNumber?: string | null;
  division?: string | { label?: string | null; name?: string | null } | null;
};

const PROJECT_SWITCHER_PAGE_SIZE = 50;

function getProjectDivisionLabel(project: ProjectSwitcherProject) {
  const { division } = project;

  if (typeof division === 'string') return division;

  return division?.label || division?.name || 'N/A';
}

function getProjectSubtitle(project: ProjectSwitcherProject) {
  return [project.jobNumber, getProjectDivisionLabel(project)].filter(Boolean).join(' - ');
}

function ProjectSwitcherLoadingRows() {
  return (
    <div className="space-y-2 p-2.5">
      {[1, 2, 3].map((row) => (
        <div key={row} className="space-y-1.5 rounded-md px-2 py-1.5">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-sidebar-popover-muted/35" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-sidebar-popover-muted/20" />
        </div>
      ))}
    </div>
  );
}

export function ProjectSidebarSwitcher() {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { changeProject, projectId } = useProjectNavigation();
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 250);
  const activeSearch = open ? debouncedSearch : '';

  const projectDetailQuery = useProjectDetailQuery(projectId ?? '');
  const projectsQuery = useInfiniteProjectOptionsQuery(
    {
      size: PROJECT_SWITCHER_PAGE_SIZE,
      sortBy: 'name',
      sortOrder: 'asc',
      search: activeSearch || undefined,
    },
    {
      enabled: open,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const projects = useMemo(
    () => projectsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [projectsQuery.data?.pages]
  );

  const currentProject = useMemo<ProjectSwitcherProject | null>(() => {
    return projectDetailQuery.data ?? projects.find((project) => project.id === projectId) ?? null;
  }, [projectDetailQuery.data, projectId, projects]);

  const renderedProjects = useMemo<ProjectSwitcherProject[]>(() => {
    const byId = new Map<string, ProjectSwitcherProject>();

    if (currentProject) byId.set(currentProject.id, currentProject);

    for (const project of projects) {
      byId.set(project.id, project);
    }

    return Array.from(byId.values());
  }, [currentProject, projects]);

  const totalProjects = projectsQuery.data?.pages[0]?.pagination.totalItems ?? 0;
  const hasLoadedProjects = projectsQuery.data !== undefined;
  const isInitialListLoading =
    open && (projectsQuery.isLoading || (projectsQuery.isFetching && !hasLoadedProjects));
  const isRefreshingResults =
    open && hasLoadedProjects && projectsQuery.isFetching && !projectsQuery.isFetchingNextPage;
  const selectedProjectTitle = currentProject?.name;
  const selectedProjectSubtitle = currentProject ? getProjectSubtitle(currentProject) : '';

  const handleSelect = (id: string) => {
    if (id === projectId) {
      setOpen(false);
      return;
    }
    changeProject(id);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchInput('');
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden px-2.5 py-2.5">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="group grid h-auto w-full min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-sm border border-sidebar-border bg-sidebar-item-hover px-3 py-2 text-sidebar-foreground shadow-none hover:border-sidebar-border hover:bg-sidebar-item-active hover:text-sidebar-foreground data-[state=open]:border-sidebar-border data-[state=open]:bg-sidebar-item-active data-[state=open]:text-sidebar-foreground"
          >
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            <div className="min-w-0 overflow-hidden text-left">
              <div
                className="truncate text-sm font-semibold text-sidebar-foreground"
                title={selectedProjectTitle}
              >
                {selectedProjectTitle ??
                  (projectDetailQuery.isLoading ? 'Loading project...' : 'Select Project')}
              </div>
              {selectedProjectSubtitle && (
                <div
                  className="truncate text-xs text-sidebar-muted"
                  title={selectedProjectSubtitle}
                >
                  {selectedProjectSubtitle}
                </div>
              )}
            </div>
            <ChevronsUpDown className="mt-1 size-4 shrink-0 text-sidebar-muted transition-colors group-hover:text-sidebar-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 border-sidebar-popover-border bg-sidebar-popover-bg p-0 text-sidebar-popover-foreground shadow-xl shadow-black/30"
          align="start"
          sideOffset={4}
        >
          <Command
            shouldFilter={false}
            className="bg-sidebar-popover-bg text-sidebar-popover-foreground [&_[data-slot=command-input]]:border-sidebar-popover-border"
          >
            <div className="relative">
              <CommandInput
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Search projects..."
                className="pr-8 text-sidebar-popover-foreground placeholder:text-sidebar-popover-muted"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xs p-0.5 text-sidebar-popover-muted opacity-70 transition-opacity hover:bg-sidebar-popover-hover hover:text-sidebar-popover-foreground hover:opacity-100"
                  aria-label="Clear project search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <CommandList
              className="max-h-80"
              onScroll={(event) => {
                const target = event.currentTarget;
                const isNearBottom =
                  target.scrollTop + target.clientHeight >= target.scrollHeight - 32;

                if (
                  isNearBottom &&
                  projectsQuery.hasNextPage &&
                  !projectsQuery.isFetchingNextPage
                ) {
                  void projectsQuery.fetchNextPage();
                }
              }}
            >
              {isInitialListLoading ? (
                <ProjectSwitcherLoadingRows />
              ) : projectsQuery.isError ? (
                <div className="px-4 py-6 text-center text-sm text-sidebar-popover-muted">
                  Unable to load projects.
                </div>
              ) : (
                <>
                  {isRefreshingResults && renderedProjects.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 border-b border-sidebar-popover-border bg-sidebar-popover-bg px-3 py-2 text-xs text-sidebar-popover-muted">
                      <Loader2 className="size-3 animate-spin text-brand-gold" />
                      Updating results
                    </div>
                  )}
                  <CommandEmpty>No projects found.</CommandEmpty>
                  <CommandGroup>
                    {renderedProjects.map((project) => {
                      const subtitle = getProjectSubtitle(project);
                      const isSelected = project.id === projectId;

                      return (
                        <CommandItem
                          key={project.id}
                          value={project.id}
                          keywords={[project.name, project.jobNumber ?? '', subtitle]}
                          onSelect={() => handleSelect(project.id)}
                          className={cn(
                            'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-md text-sidebar-popover-foreground data-[selected=true]:bg-sidebar-popover-hover',
                            isSelected && 'bg-sidebar-popover-active'
                          )}
                          title={subtitle ? `${project.name} - ${subtitle}` : project.name}
                        >
                          <div className="min-w-0 overflow-hidden">
                            <div className="truncate text-sm font-medium" title={project.name}>
                              {project.name}
                            </div>
                            {subtitle && (
                              <div
                                className="truncate text-xs text-sidebar-popover-muted"
                                title={subtitle}
                              >
                                {subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && <CommandCheck className="text-brand-gold" />}
                        </CommandItem>
                      );
                    })}
                    {projectsQuery.isFetchingNextPage && (
                      <CommandItem
                        value="loading-more-projects"
                        disabled
                        className="text-sidebar-popover-muted"
                      >
                        <Loader2 className="me-2 size-3 animate-spin text-brand-gold" />
                        Loading more projects...
                      </CommandItem>
                    )}
                  </CommandGroup>
                  {totalProjects > renderedProjects.length && !projectsQuery.isFetchingNextPage && (
                    <div className="border-t border-sidebar-popover-border px-3 py-2 text-center text-xs text-sidebar-popover-muted">
                      Showing {renderedProjects.length} of {totalProjects}
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
