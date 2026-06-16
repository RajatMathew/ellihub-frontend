import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDate, getInitials } from '@/app/lib/helpers';
import {
  getEmployeeStatusLabel,
  getEmployeeStatusTone,
} from '@/modules/hr/components/employees/list/employee-list-utils';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { MoreHorizontal, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeActionsCellProps {
  employee: Employee;
  onDelete: (employee: { id: string; name: string }) => void;
}

export function EmployeeNameCell({ employee }: { employee: Employee }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary ring-2 ring-background">
        {getInitials(employee.name, 2)}
      </div>
      <Link
        to={employee.id}
        className="min-w-0 break-words text-sm font-bold text-foreground transition-colors hover:text-primary"
      >
        {employee.name}
      </Link>
    </div>
  );
}

export function EmployeeDepartmentCell({ employee }: { employee: Employee }) {
  return (
    <div className="inline-flex max-w-full rounded border border-border/50 bg-muted/50 px-2 py-0.5 text-xs font-bold tracking-normal text-foreground/80">
      <span className="truncate">{employee.department?.name || 'Unassigned'}</span>
    </div>
  );
}

export function EmployeeEmailCell({ employee }: { employee: Employee }) {
  return (
    <a
      href={`mailto:${employee.email}`}
      className="break-all text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {employee.email}
    </a>
  );
}

export function EmployeePhoneCell({ employee }: { employee: Employee }) {
  return (
    <span className="text-sm font-medium text-muted-foreground">{employee.phoneNumber || '-'}</span>
  );
}

export function EmployeeStatusCell({ employee }: { employee: Employee }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold tracking-normal ${getEmployeeStatusTone(
        employee.status
      )}`}
    >
      {getEmployeeStatusLabel(employee.status)}
    </span>
  );
}

export function EmployeeStartDateCell({ employee }: { employee: Employee }) {
  return (
    <div className="pr-2 text-end text-sm font-medium text-muted-foreground">
      {employee.startDate ? formatDate(employee.startDate) : '-'}
    </div>
  );
}

export function EmployeeActionsCell({ employee, onDelete }: EmployeeActionsCellProps) {
  return (
    <div className="flex justify-end pr-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" mode="icon" size="sm" className="size-8 hover:bg-muted">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link to={employee.id}>View Full Details</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`${employee.id}/edit`}>Edit Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete({ id: employee.id, name: employee.name })}
          >
            <UserMinus className="mr-2 size-4" />
            Delete Employee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function EmployeeNameSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
