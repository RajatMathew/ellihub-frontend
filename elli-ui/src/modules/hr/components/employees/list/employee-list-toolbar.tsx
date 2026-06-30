import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeListToolbarProps {
  isLoading?: boolean;
  totalCount: number;
  searchQuery: string;
}

export function EmployeeListToolbar({
  isLoading,
  totalCount,
  searchQuery,
}: EmployeeListToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>Employees</ToolbarPageTitle>
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {searchQuery
                ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
                : `Active Workforce: ${totalCount}`}
            </span>
          )}
        </ToolbarHeading>
        <ToolbarActions>
          <Button size="sm" asChild>
            <Link to="create">
              <Plus className="size-4" />
              Add Employee
            </Link>
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
