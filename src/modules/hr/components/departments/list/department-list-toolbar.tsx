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

interface DepartmentListToolbarProps {
  isLoading?: boolean;
  totalCount: number;
  searchQuery: string;
}

export function DepartmentListToolbar({
  isLoading,
  totalCount,
  searchQuery,
}: DepartmentListToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>Departments</ToolbarPageTitle>
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {searchQuery
                ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
                : `Total Departments: ${totalCount}`}
            </span>
          )}
        </ToolbarHeading>
        <ToolbarActions>
          <Button size="sm" asChild>
            <Link to="create">
              <Plus className="size-4" />
              Add Department
            </Link>
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
