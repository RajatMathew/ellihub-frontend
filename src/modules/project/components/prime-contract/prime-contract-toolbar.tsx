import { Button } from '@app/components/ui/button';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';

import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface PrimeContractToolbarProps {
  project: ProjectDetail | undefined;
  onEditContract?: () => void;
}

export function PrimeContractToolbar({
  project,
  onEditContract,
}: PrimeContractToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          {project?.name && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
          <ToolbarPageTitle>Prime Contract</ToolbarPageTitle>
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
          <Button
            variant="outline"
            size="sm"
            disabled={!onEditContract}
            onClick={onEditContract}
          >
            Edit Contract
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
