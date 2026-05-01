import { Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';

interface CostCodesPageHeaderProps {
  totalCount: number;
  hasActiveFilters: boolean;
  onCreate: () => void;
}

export function CostCodesPageHeader({
  totalCount,
  hasActiveFilters,
  onCreate,
}: CostCodesPageHeaderProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>Cost Codes</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
              : `Total: ${totalCount}`}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          <Button size="sm" variant="outline" asChild>
            <Link to="categories">
              <Edit className="size-4" />
              Categories
            </Link>
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            Add Cost Code
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
