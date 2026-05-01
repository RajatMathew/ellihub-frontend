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

interface ResourcePageHeaderProps {
  title: string;
  totalCount: number;
  hasActiveFilters: boolean;
  resultLabel?: string;
  description?: ReactNode;
  actions?: ReactNode;
  addLabel?: string;
  addTo?: string;
  addIcon?: ReactNode;
  onAdd?: () => void;
}

export function ResourcePageHeader({
  title,
  totalCount,
  hasActiveFilters,
  resultLabel,
  description,
  actions,
  addLabel,
  addTo,
  addIcon,
  onAdd,
}: ResourcePageHeaderProps) {
  const summary = hasActiveFilters
    ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
    : resultLabel
      ? `All ${resultLabel}: ${totalCount}`
      : `Total: ${totalCount}`;
  const hasAddAction = addLabel && (addTo || onAdd);

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          {description ?? <span className="text-sm text-muted-foreground">{summary}</span>}
        </ToolbarHeading>
        {(actions || hasAddAction) && (
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
            {addLabel && !addTo && onAdd && (
              <Button size="sm" onClick={onAdd}>
                {addIcon}
                {addLabel}
              </Button>
            )}
          </ToolbarActions>
        )}
      </ToolbarWrapper>
    </Toolbar>
  );
}
