import { useState } from 'react';

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
import { useAssignEmployeeMutation } from '@/modules/hr/hooks/departments.hooks';
import { useEmployeesQuery } from '@/modules/hr/hooks/employees.hooks';
import type { Employee } from '@/modules/hr/schemas/employee.schema';

interface EmployeeAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
}

export function EmployeeAssignDialog({
  open,
  onOpenChange,
  departmentId,
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

  const handleAssign = async () => {
    if (!selectedEmployeeId) return;

    await assignMutation.mutateAsync({
      departmentId,
      employeeId: selectedEmployeeId,
      roleId: selectedRoleId || undefined,
    });

    onOpenChange(false);
    setSelectedEmployeeId('');
    setSelectedRoleId('');
  };

  const employeeOptions = (employeesData?.data ?? []).map((employee: Employee) => ({
    value: employee.id,
    label: employee.name,
  }));

  const roleOptions = (rolesData ?? []).map((role) => ({
    value: role.id,
    label: role.label || role.name || 'Unknown Role',
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!selectedEmployeeId || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign to Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
