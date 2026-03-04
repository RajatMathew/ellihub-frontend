import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';

import { DIVISION_LABELS } from '@modules/project/constants/project.constants';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface ProjectToolbarHeaderProps {
  title: string;
  project: ProjectDetail | undefined;
  children?: React.ReactNode;
}

export function ProjectToolbarHeader({ title, project, children }: ProjectToolbarHeaderProps) {
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
            {project?.stage && (
              <Badge variant="secondary" appearance="outline" size="sm">
                {project.stage.name}
              </Badge>
            )}
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
