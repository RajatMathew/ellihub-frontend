import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import { getDepartmentEmployeeId } from '@/modules/hr/components/departments/detail/department-employee-utils';
import { useAssignEmployeeMutation } from '@/modules/hr/hooks/departments.hooks';
import { useEmployeesQuery } from '@/modules/hr/hooks/employees.hooks';
import type { DepartmentEmployee } from '@/modules/hr/schemas/department.schema';
import type { Employee } from '@/modules/hr/schemas/employee.schema';

interface EmployeeAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  assignedEmployees: DepartmentEmployee[];
}

export function EmployeeAssignDialog({
  open,
  onOpenChange,
  departmentId,
  assignedEmployees,
}: EmployeeAssignDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const { data: employeesData, isLoading: isEmployeesLoading } = useEmployeesQuery({
    page: 1,
    size: 1000,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const { data: rolesData, isLoading: isRolesLoading } = useAppLookupsQuery('PROFESSIONAL_ROLE');
  const assignMutation = useAssignEmployeeMutation();

  const employeeOptions = useMemo(() => {
    const assignedEmployeeIds = new Set(
      assignedEmployees
        .map((assignment) => getDepartmentEmployeeId(assignment))
        .filter((employeeId) => employeeId.length > 0)
    );

    return (employeesData?.data ?? [])
      .filter(
        (employee: Employee) =>
          !assignedEmployeeIds.has(employee.id) && employee.departmentId !== departmentId
      )
      .map((employee: Employee) => ({
        value: employee.id,
        label: employee.name,
      }));
  }, [assignedEmployees, departmentId, employeesData?.data]);

  const roleOptions = (rolesData ?? []).map((role) => ({
    value: role.id,
    label: role.label || role.name || 'Unknown Role',
  }));

  const hasSelectedEmployee = employeeOptions.some((option) => option.value === selectedEmployeeId);

  const resetSelections = () => {
    setSelectedEmployeeId('');
    setSelectedRoleId('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetSelections();
    onOpenChange(nextOpen);
  };

  const handleAssign = async () => {
    if (!hasSelectedEmployee) return;

    await assignMutation.mutateAsync({
      departmentId,
      employeeId: selectedEmployeeId,
      roleId: selectedRoleId || undefined,
    });

    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest">
            Assign Employee
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an employee to assign to this department.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Field>
            <FieldLabel className="text-xs font-bold uppercase tracking-widest">
              Employee
            </FieldLabel>
            <SearchableSelect
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={(value) => setSelectedEmployeeId(value ?? '')}
              placeholder="Search employees..."
              emptyMessage="No unassigned employees found."
              disabled={isEmployeesLoading}
            />
          </Field>

          <Field>
            <FieldLabel className="text-xs font-bold uppercase tracking-widest">
              Role (Optional)
            </FieldLabel>
            <SearchableSelect
              options={roleOptions}
              value={selectedRoleId}
              onValueChange={(value) => setSelectedRoleId(value ?? '')}
              placeholder="Select a role..."
              disabled={isRolesLoading}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!hasSelectedEmployee || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign to Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
