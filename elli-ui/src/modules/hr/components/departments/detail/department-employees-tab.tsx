import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { getInitials } from '@/app/lib/helpers';
import {
  getDepartmentEmployeeEmail,
  getDepartmentEmployeeId,
  getDepartmentEmployeeKey,
  getDepartmentEmployeeName,
  getDepartmentEmployeeRole,
} from '@/modules/hr/components/departments/detail/department-employee-utils';
import type { DepartmentEmployee } from '@/modules/hr/schemas/department.schema';
import { Mail, MoreHorizontal, Plus, UserMinus } from 'lucide-react';

interface DepartmentEmployeesTabProps {
  employees: DepartmentEmployee[];
  isRemoving: boolean;
  onAssign: () => void;
  onRemove: (employeeId: string) => void;
}

export function DepartmentEmployeesTab({
  employees,
  isRemoving,
  onAssign,
  onRemove,
}: DepartmentEmployeesTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Department Team
          </CardTitle>
          <Button
            size="xs"
            variant="primary"
            className="h-7 uppercase tracking-wide"
            onClick={onAssign}
          >
            <Plus className="size-3" />
            Assign Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {employees.map((assignment) => (
              <DepartmentEmployeeCard
                key={getDepartmentEmployeeKey(assignment)}
                assignment={assignment}
                isRemoving={isRemoving}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : (
          <DepartmentTeamEmptyState onAssign={onAssign} />
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentEmployeeCard({
  assignment,
  isRemoving,
  onRemove,
}: {
  assignment: DepartmentEmployee;
  isRemoving: boolean;
  onRemove: (employeeId: string) => void;
}) {
  const employeeId = getDepartmentEmployeeId(assignment);
  const displayName = getDepartmentEmployeeName(assignment);
  const role = getDepartmentEmployeeRole(assignment);
  const email = getDepartmentEmployeeEmail(assignment);

  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
          {getInitials(displayName, 2)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              mode="icon"
              className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              aria-label={`Actions for ${displayName}`}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={!employeeId || isRemoving}
              onClick={() => {
                if (employeeId) onRemove(employeeId);
              }}
            >
              <UserMinus className="size-3.5" />
              Remove from Department
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-w-0 space-y-1">
        <div className="truncate text-sm font-semibold uppercase tracking-tight text-foreground">
          {displayName}
        </div>
        <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {role}
        </div>
      </div>
      {email && (
        <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <Mail className="size-3 shrink-0" />
          <span className="truncate">{email}</span>
        </div>
      )}
    </div>
  );
}

function DepartmentTeamEmptyState({ onAssign }: { onAssign: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted/50">
        <UserMinus className="size-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground">No employees assigned yet.</p>
      <p className="max-w-md text-xs text-muted-foreground">
        Assign employees to this department to track team structure.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onAssign}>
        <Plus className="size-3.5" />
        Assign Employee
      </Button>
    </div>
  );
}
