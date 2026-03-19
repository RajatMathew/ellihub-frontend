import { ChevronDown, Check } from 'lucide-react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';

import { DIVISION_LABELS } from '@modules/project/constants/project.constants';
import { useProjectStagesQuery, useUpdateProjectMutation } from '@modules/project/hooks';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface ProjectToolbarHeaderProps {
  title: string;
  project: ProjectDetail | undefined;
  children?: React.ReactNode;
}

export function ProjectToolbarHeader({ title, project, children }: ProjectToolbarHeaderProps) {
  const { data: stages } = useProjectStagesQuery();
  const updateMutation = useUpdateProjectMutation();

  const handleStageChange = (stageId: string) => {
    if (!project || stageId === project.stageId) return;
    updateMutation.mutate({ id: project.id, data: { stageId } });
  };

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <ToolbarPageTitle>{title}</ToolbarPageTitle>
            {project?.status && (
              <Badge
                style={{ backgroundColor: project.status.color, color: '#fff' }}
                size="sm"
              >
                {project.status.label}
              </Badge>
            )}
            {project?.stage && stages && stages.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <span
                      className="size-2 rounded-sm shrink-0"
                      style={{ backgroundColor: project.stage.color }}
                    />
                    {project.stage.name}
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {stages.map((stage) => (
                    <DropdownMenuItem
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                    >
                      <span
                        className="size-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="flex-1">{stage.name}</span>
                      {stage.id === project.stageId && (
                        <Check className="size-3.5 text-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : project?.stage ? (
              <Badge variant="secondary" appearance="outline" size="sm">
                {project.stage.name}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {project?.name && title !== project.name && (
              <span>
                <span className="font-medium">Project:</span> {project.name}
              </span>
            )}
            {project?.jobNumber && (
              <span>
                <span className="font-medium">Job #:</span> {project.jobNumber}
              </span>
            )}
            {project?.division && (
              <span>
                <span className="font-medium">Division:</span>{' '}
                {DIVISION_LABELS[project.division] ?? project.division}
              </span>
            )}
            {project?.gc && (
              <span>
                <span className="font-medium">GC:</span> {project.gc.name}
              </span>
            )}
            {project?.leadPM && (
              <span>
                <span className="font-medium">PM:</span> {project.leadPM.name}
              </span>
            )}
          </div>
        </ToolbarHeading>
        {children && <ToolbarActions>{children}</ToolbarActions>}
      </ToolbarWrapper>
    </Toolbar>
  );
}
