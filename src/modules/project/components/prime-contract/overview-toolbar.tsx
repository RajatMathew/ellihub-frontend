import { EllipsisVertical } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';

import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface OverviewToolbarProps {
  project: ProjectDetail | undefined;
  onDeleteProject: () => void;
}

export function OverviewToolbar({
  project,
  onDeleteProject,
}: OverviewToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          {project?.name && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
          <ToolbarPageTitle>Overview</ToolbarPageTitle>
          {(project?.gc || project?.leadPM) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {project.gc && (
                <span>
                  <span className="font-medium">GC:</span> {project.gc.name}
                </span>
              )}
              {project.leadPM && (
                <span>
                  <span className="font-medium">PM:</span> {project.leadPM.name}
                </span>
              )}
            </div>
          )}
        </ToolbarHeading>
        <ToolbarActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={onDeleteProject}>
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
