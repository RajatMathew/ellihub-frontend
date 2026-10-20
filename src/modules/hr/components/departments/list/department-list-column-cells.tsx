import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDepartmentDate } from '@/modules/hr/components/departments/list/department-list-utils';
import type { Department } from '@/modules/hr/schemas/department.schema';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DepartmentCellProps {
  department: Department;
}

export function DepartmentNameCell({ department }: DepartmentCellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        to={department.id}
        className="truncate text-sm font-semibold text-foreground hover:text-primary"
      >
        {department.name}
      </Link>
      {department.description && (
        <span className="line-clamp-1 text-xs text-muted-foreground">{department.description}</span>
      )}
    </div>
  );
}

export function DepartmentNameSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function DepartmentEmployeeCountCell({ department }: DepartmentCellProps) {
  return (
    <div className="flex items-center gap-2">
      <Users className="size-3.5 text-muted-foreground" />
      <span className="text-sm font-medium">{department.employeeCount ?? 0}</span>
    </div>
  );
}

export function DepartmentCreatedCell({ department }: DepartmentCellProps) {
  return (
    <span className="text-sm text-muted-foreground">
      {formatDepartmentDate(department.createdAt)}
    </span>
  );
}
