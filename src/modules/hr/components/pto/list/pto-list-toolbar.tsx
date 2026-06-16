import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PTOListToolbarProps {
  totalCount: number;
  searchQuery: string;
}

export function PTOListToolbar({ totalCount, searchQuery }: PTOListToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Employee Directory
          </div>
          <ToolbarPageTitle>Time Off Requests</ToolbarPageTitle>
          <span className="text-sm text-muted-foreground">
            {searchQuery
              ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
              : `Total Requests: ${totalCount}`}
          </span>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="primary" size="sm" asChild>
            <Link to="create">
              <Plus className="size-4" />
              New Request
            </Link>
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
