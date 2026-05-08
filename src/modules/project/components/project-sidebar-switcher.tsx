import { useState } from 'react';

import { ChevronsUpDown } from 'lucide-react';

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
    <div className="w-full min-w-0 max-w-full overflow-hidden px-2.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="grid h-auto w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden bg-primary/10 px-3 py-2 text-primary hover:bg-primary/20 hover:text-primary"
          >
            <div className="min-w-0 overflow-hidden text-left">
              <div className="truncate text-sm font-semibold" title={currentProject?.name}>
                {currentProject?.name ?? 'Select Project'}
              </div>
              {currentProject && (
                <div className="truncate text-xs opacity-75" title={getProjectSubtitle(currentProject)}>
                  {getProjectSubtitle(currentProject)}
                </div>
              )}
            </div>
            <ChevronsUpDown className="size-4 shrink-0 opacity-75" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dark p-0 w-64" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Search projects..." />
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
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto]"
                    title={`${project.name} - ${getProjectSubtitle(project)}`}
                  >
                    <div className="min-w-0 overflow-hidden">
                      <div className="truncate text-sm font-medium" title={project.name}>
                        {project.name}
                      </div>
                      <div
                        className="truncate text-xs text-muted-foreground"
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
