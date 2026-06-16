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
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import {
  Calendar,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeDetailToolbarProps {
  employee: Employee;
  sidebarOpen: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function EmployeeDetailToolbar({
  employee,
  sidebarOpen,
  onDelete,
  onOpenSidebar,
}: EmployeeDetailToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to=".." relative="path" className="transition-colors hover:text-foreground">
              Employees
            </Link>
            {' / '}
            <span>Profile Overview</span>
          </div>
          <ToolbarPageTitle>{employee.name}</ToolbarPageTitle>
          <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground">
              <ShieldAlert className="size-3.5" />
              <span className="break-words">
                {employee.role?.label || employee.role?.name || 'No Professional Role'}
              </span>
            </div>
            {employee.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <span>Joined {new Date(employee.startDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto sm:justify-end">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="edit">
              <Pencil className="size-4" />
              Edit Profile
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" mode="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="edit">
                  <Pencil className="size-4" />
                  Edit Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Deactivate Account
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
              Contact Info
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
