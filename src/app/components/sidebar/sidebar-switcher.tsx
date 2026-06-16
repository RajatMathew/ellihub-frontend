import { useState } from 'react';

import { Check, ChevronsUpDown, Gem, Hexagon, Layers2, Zap } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { cn } from '@app/lib/utils';

interface Project {
  id: string;
  icon: React.ElementType;
  name: string;
  color: string;
  members: number;
}

export const SidebarSwitcher = ({
  projects = [
    {
      id: '1',
      icon: Zap,
      name: 'Thunder AI',
      color: 'bg-teal-600 text-white',
      members: 8,
    },
    {
      id: '2',
      icon: Gem,
      name: 'Clarity AI',
      color: 'bg-fuchsia-600 text-white',
      members: 6,
    },
    {
      id: '3',
      icon: Hexagon,
      name: 'Lightning AI',
      color: 'bg-yellow-600 text-white',
      members: 12,
    },
    {
      id: '4',
      icon: Layers2,
      name: 'Bold AI',
      color: 'bg-blue-600 text-white',
      members: 4,
    },
  ],
  onChange,
  value,
}: {
  projects?: Project[];
  onChange?: (project: Project) => void;
  value?: string;
}) => {
  const [selectedProject, setSelectedProject] = useState<Project>(
    projects.find((project) => project.id === value) || projects[0]
  );

  const handleChange = (project: Project) => {
    setSelectedProject(project);
    if (onChange) {
      onChange(project);
    }
  };

  return (
    <div className="flex items-center justify-between px-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="inline-flex text-muted-foreground hover:text-foreground px-1.5 -ms-1.5 w-full"
          >
            <div
              className={cn(
                'size-6 flex items-center justify-center rounded-md',
                selectedProject.color
              )}
            >
              <selectedProject.icon className="size-4" />
            </div>

            <span className="text-foreground text-sm font-medium flex-1 text-left">
              {selectedProject.name}
            </span>
            <ChevronsUpDown className="opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          side="bottom"
          align="end"
          sideOffset={10}
          alignOffset={-20}
        >
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.name}
              onClick={() => handleChange(project)}
              data-active={selectedProject.name === project.name}
            >
              <div
                className={cn('size-6 rounded-md flex items-center justify-center', project.color)}
              >
                <project.icon className="size-4" />
              </div>
              <span className="text-foreground text-sm font-medium">{project.name}</span>
              {selectedProject.name === project.name && (
                <Check className="ms-auto size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
