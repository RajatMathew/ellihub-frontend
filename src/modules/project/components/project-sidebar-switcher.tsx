import { useState } from 'react';

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
import { useProjectNavigation } from '@/app/hooks/use-project-hook';
import { useProjectsQuery } from '@/modules/project/hooks';
import { ChevronsUpDown } from 'lucide-react';

export function ProjectSidebarSwitcher() {
  const [open, setOpen] = useState(false);
  const { changeProject, projectId } = useProjectNavigation();

  const { data } = useProjectsQuery({ size: 25, sortBy: 'createdAt', sortOrder: 'desc' });
  const projects = data?.data ?? [];

  const currentProject = projects.find((p) => p.id === projectId);
  const getProjectDivisionLabel = (project: (typeof projects)[number]) => {
    const { division } = project;

    if (typeof division === 'string') return division;

    return division?.label || division?.name || 'N/A';
  };
  const getProjectSubtitle = (project: (typeof projects)[number]) =>
    [project.jobNumber, getProjectDivisionLabel(project)].filter(Boolean).join(' \u00b7 ');

  const handleSelect = (id: string) => {
    if (id === projectId) {
      setOpen(false);
      return;
    }
    changeProject(id);
    setOpen(false);
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden px-2.5 py-2.5">
      <Popover open={open} onOpenChange={setOpen}>
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
                title={currentProject?.name}
              >
                {currentProject?.name ?? 'Select Project'}
              </div>
              {currentProject && (
                <div
                  className="truncate text-xs text-emerald-200/75"
                  title={getProjectSubtitle(currentProject)}
                >
                  {getProjectSubtitle(currentProject)}
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
          <Command className="bg-zinc-900 text-zinc-50 [&_[data-slot=command-input]]:border-zinc-700/80">
            <CommandInput
              placeholder="Search projects..."
              className="text-zinc-50 placeholder:text-zinc-500"
            />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    keywords={[
                      project.name,
                      project.jobNumber ?? '',
                      getProjectDivisionLabel(project),
                    ]}
                    onSelect={() => handleSelect(project.id)}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-md text-zinc-50 data-[selected=true]:bg-zinc-800"
                    title={`${project.name} - ${getProjectSubtitle(project)}`}
                  >
                    <div className="min-w-0 overflow-hidden">
                      <div className="truncate text-sm font-medium" title={project.name}>
                        {project.name}
                      </div>
                      <div
                        className="truncate text-xs text-zinc-400"
                        title={getProjectSubtitle(project)}
                      >
                        {getProjectSubtitle(project)}
                      </div>
                    </div>
                    {project.id === projectId && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
