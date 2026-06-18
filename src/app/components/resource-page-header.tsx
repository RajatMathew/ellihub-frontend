import type { ReactNode } from 'react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Link } from 'react-router-dom';

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
  isLoading?: boolean;
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
  isLoading,
  onAdd,
}: ResourcePageHeaderProps) {
  const summary = hasActiveFilters
    ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
    : resultLabel
      ? `All ${resultLabel}: ${totalCount}`
      : `Total: ${totalCount}`;
  const hasAddAction = addLabel && (addTo || onAdd);
  const descriptionContent = isLoading ? (
    <Skeleton className="h-4 w-28" />
  ) : (
    (description ?? <span className="text-sm text-muted-foreground">{summary}</span>)
  );

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          {descriptionContent}
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
