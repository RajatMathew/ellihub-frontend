import { useMemo, useState } from 'react';

import { Alert, AlertContent, AlertDescription, AlertIcon } from '@/app/components/ui/alert';
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
import { getDepartmentEmployeeId } from '@/modules/hr/components/departments/detail/department-employee-utils';
import { useAssignEmployeeMutation } from '@/modules/hr/hooks/departments.hooks';
import { useEmployeesQuery } from '@/modules/hr/hooks/employees.hooks';
import type { DepartmentEmployee } from '@/modules/hr/schemas/department.schema';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { Info } from 'lucide-react';

interface EmployeeAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  departmentName: string;
  assignedEmployees: DepartmentEmployee[];
}

export function EmployeeAssignDialog({
  open,
  onOpenChange,
  departmentId,
  departmentName,
  assignedEmployees,
}: EmployeeAssignDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const { data: employeesData, isLoading: isEmployeesLoading } = useEmployeesQuery({
    page: 1,
    size: 1000,
    sortBy: 'name',
    sortOrder: 'asc',
  });
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

  const selectedEmployee = useMemo(
    () => (employeesData?.data ?? []).find((employee) => employee.id === selectedEmployeeId),
    [employeesData?.data, selectedEmployeeId]
  );

  const selectedEmployeeDepartmentName = selectedEmployee?.department?.name ?? 'another department';
  const shouldShowDepartmentReassignmentNotice =
    Boolean(selectedEmployee?.departmentId) && selectedEmployee?.departmentId !== departmentId;
  const hasSelectedEmployee = employeeOptions.some((option) => option.value === selectedEmployeeId);

  const resetSelections = () => {
    setSelectedEmployeeId('');
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

          {shouldShowDepartmentReassignmentNotice && (
            <Alert variant="info" appearance="light" size="sm">
              <AlertIcon>
                <Info className="size-4" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription className="text-xs leading-relaxed">
                  This employee is already in{' '}
                  <span className="font-semibold text-foreground">
                    {selectedEmployeeDepartmentName}
                  </span>
                  . Assigning them here will remove them from that department and assign them to{' '}
                  <span className="font-semibold text-foreground">{departmentName}</span>.
                </AlertDescription>
              </AlertContent>
            </Alert>
          )}
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
