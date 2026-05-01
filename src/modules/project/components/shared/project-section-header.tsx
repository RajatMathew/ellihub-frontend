import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';

interface ProjectSectionHeaderProps {
  title: string;
  resultLabel: string;
  totalCount: number;
  hasActiveFilters: boolean;
  description?: ReactNode;
  actions?: ReactNode;
  addLabel?: string;
  addTo?: string;
  addIcon?: ReactNode;
}

export function ProjectSectionHeader({
  title,
  resultLabel,
  totalCount,
  hasActiveFilters,
  description,
  actions,
  addLabel,
  addTo,
  addIcon,
}: ProjectSectionHeaderProps) {
  const summary = hasActiveFilters
    ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
    : `All ${resultLabel}: ${totalCount}`;

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          {description ?? <span className="text-sm text-muted-foreground">{summary}</span>}
        </ToolbarHeading>
        {(actions || (addLabel && addTo)) && (
          <ToolbarActions>
            {actions}
            {addLabel && addTo && (
              <Button size="sm" asChild>
                <Link to={addTo}>
                  {addIcon}
                  {addLabel}
                </Link>
              </Button>
            )}
          </ToolbarActions>
        )}
      </ToolbarWrapper>
    </Toolbar>
  );
}
