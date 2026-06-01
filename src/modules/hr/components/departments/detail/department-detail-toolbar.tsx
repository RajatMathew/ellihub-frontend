import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { DepartmentDetail } from '@/modules/hr/schemas/department.schema';
import { Calendar, MoreHorizontal, PanelRightOpen, Pencil, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DepartmentDetailToolbarProps {
  department: DepartmentDetail;
  employeeCount: number;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onDelete: () => void;
}

export function DepartmentDetailToolbar({
  department,
  employeeCount,
  sidebarOpen,
  onOpenSidebar,
  onDelete,
}: DepartmentDetailToolbarProps) {
  const canDelete = employeeCount === 0;

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="../.." relative="path" className="transition-colors hover:text-foreground">
              Departments
            </Link>
            {' / '}
            <span>Overview</span>
          </div>
          <ToolbarPageTitle>{department.name}</ToolbarPageTitle>
          <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground">
              <Users className="size-3.5" />
              <span>{employeeCount} Employees</span>
            </div>
            {department.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <span>Created {new Date(department.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="edit">
              <Pencil className="size-4" />
              Edit Department
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" mode="icon" aria-label="Department actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit Department
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!canDelete}
                title={
                  canDelete
                    ? undefined
                    : 'Remove employees from this department before deleting it.'
                }
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Delete Department
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onOpenSidebar}
            >
              <PanelRightOpen className="size-4" />
              View Activity
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
