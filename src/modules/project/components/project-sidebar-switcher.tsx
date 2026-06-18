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
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-700/80" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
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
            className="group grid h-auto w-full min-w-0 max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 overflow-hidden rounded-lg border border-emerald-800/70 bg-emerald-950/75 px-3 py-2 text-emerald-50 shadow-none hover:border-emerald-700/80 hover:bg-emerald-900/70 hover:text-white data-[state=open]:border-emerald-700/80 data-[state=open]:bg-emerald-900/70 data-[state=open]:text-white"
          >
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            <div className="min-w-0 overflow-hidden text-left">
              <div
                className="truncate text-sm font-semibold text-emerald-50"
                title={selectedProjectTitle}
              >
                {selectedProjectTitle ??
                  (projectDetailQuery.isLoading ? 'Loading project...' : 'Select Project')}
              </div>
              {selectedProjectSubtitle && (
                <div
                  className="truncate text-xs text-emerald-200/75"
                  title={selectedProjectSubtitle}
                >
                  {selectedProjectSubtitle}
                </div>
              )}
            </div>
            <ChevronsUpDown className="mt-1 size-4 shrink-0 text-emerald-300/65 transition-colors group-hover:text-emerald-100" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 border-zinc-700/80 bg-zinc-900 p-0 text-zinc-50 shadow-xl shadow-black/30"
          align="start"
          sideOffset={4}
        >
          <Command
            shouldFilter={false}
            className="bg-zinc-900 text-zinc-50 [&_[data-slot=command-input]]:border-zinc-700/80"
          >
            <div className="relative">
              <CommandInput
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="Search projects..."
                className="pr-8 text-zinc-50 placeholder:text-zinc-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xs p-0.5 text-zinc-500 opacity-70 transition-opacity hover:bg-zinc-800 hover:text-zinc-100 hover:opacity-100"
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
                <div className="px-4 py-6 text-center text-sm text-zinc-400">
                  Unable to load projects.
                </div>
              ) : (
                <>
                  {isRefreshingResults && renderedProjects.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                      <Loader2 className="size-3 animate-spin text-emerald-400" />
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
                            'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-md text-zinc-50 data-[selected=true]:bg-zinc-800',
                            isSelected && 'bg-zinc-800/60'
                          )}
                          title={subtitle ? `${project.name} - ${subtitle}` : project.name}
                        >
                          <div className="min-w-0 overflow-hidden">
                            <div className="truncate text-sm font-medium" title={project.name}>
                              {project.name}
                            </div>
                            {subtitle && (
                              <div className="truncate text-xs text-zinc-400" title={subtitle}>
                                {subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && <CommandCheck className="text-emerald-400" />}
                        </CommandItem>
                      );
                    })}
                    {projectsQuery.isFetchingNextPage && (
                      <CommandItem value="loading-more-projects" disabled className="text-zinc-400">
                        <Loader2 className="me-2 size-3 animate-spin text-emerald-400" />
                        Loading more projects...
                      </CommandItem>
                    )}
                  </CommandGroup>
                  {totalProjects > renderedProjects.length && !projectsQuery.isFetchingNextPage && (
                    <div className="border-t border-zinc-800 px-3 py-2 text-center text-xs text-zinc-500">
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
