import { useState } from 'react';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@app/components/ui/popover';

import { useProjectsQuery } from '@modules/project/hooks';

export function ProjectSidebarSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const { data } = useProjectsQuery({ size: 100 });
  const projects = data?.data ?? [];

  const currentProject = projects.find((p) => p.id === projectId);

  const handleSelect = (id: string) => {
    if (id === projectId) {
      setOpen(false);
      return;
    }
    const encodedCurrent = encodeURIComponent(projectId!);
    const encodedNext = encodeURIComponent(id);
    const newPath = location.pathname.replace(
      `/projects/${encodedCurrent}`,
      `/projects/${encodedNext}`,
    );
    navigate(newPath, { replace: true });
    setOpen(false);
  };

  return (
    <div className="px-5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary px-3 h-auto py-2"
          >
            <div className="text-left min-w-0">
              <div className="text-sm font-semibold truncate">
                {currentProject?.name ?? 'Select Project'}
              </div>
              {currentProject && (
                <div className="text-xs opacity-75 truncate">
                  {currentProject.jobNumber} &middot; {currentProject.division}
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
                    keywords={[project.name, project.jobNumber ?? '', project.division]}
                    onSelect={() => handleSelect(project.id)}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {project.jobNumber} &middot; {project.division}
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
