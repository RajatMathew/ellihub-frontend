import { useState } from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Field, FieldLabel } from '@app/components/ui/field';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { useEmployeesQuery } from '@modules/hr/hooks/use-employees';

import { useAssignEmployeeMutation } from '../../hooks/departments.hooks';
import { useLookupsQuery } from '@modules/project/hooks/lookup.hooks';

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

  const { data: employeesData } = useEmployeesQuery({ size: 1000 });
  const { data: rolesData } = useLookupsQuery('PROFESSIONAL_ROLE');
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

  const employeeOptions = (employeesData?.data ?? []).map((emp: any) => ({
    value: emp.id,
    label: emp.fullName || emp.name,
  }));

  const roleOptions = (rolesData ?? []).map((role) => ({
    value: role.id,
    label: role.label || role.name || 'Unknown Role',
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold">
            Assign Employee
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an employee to assign to this department.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Field>
            <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
              Employee
            </FieldLabel>
            <SearchableSelect
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={(value) => setSelectedEmployeeId(value ?? '')}
              placeholder="Search employees..."
            />
          </Field>

          <Field>
            <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
              Role (Optional)
            </FieldLabel>
            <SearchableSelect
              options={roleOptions}
              value={selectedRoleId}
              onValueChange={(value) => setSelectedRoleId(value ?? '')}
              placeholder="Select a role..."
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
