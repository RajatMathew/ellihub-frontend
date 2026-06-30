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
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { getDepartmentEmployeeId } from '@/modules/hr/components/departments/detail/department-employee-utils';
import { useAssignEmployeeMutation } from '@/modules/hr/hooks/departments.hooks';
import {
  useEmployeePickerOptions,
  type EmployeePickerOption,
} from '@/modules/hr/hooks/use-employee-picker-options';
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
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [pickedEmployee, setPickedEmployee] = useState<Employee | null>(null);
  const [pickedEmployeeOption, setPickedEmployeeOption] = useState<EmployeePickerOption | null>(
    null
  );

  const assignMutation = useAssignEmployeeMutation();
  const employeePicker = useEmployeePickerOptions({
    search: employeeSearch,
    selectedOptions: pickedEmployeeOption ? [pickedEmployeeOption] : [],
    enabled: open,
    queryScope: 'department-assign-picker',
  });

  const employeeOptions = useMemo(() => {
    const assignedEmployeeIds = new Set(
      assignedEmployees
        .map((assignment) => getDepartmentEmployeeId(assignment))
        .filter((employeeId) => employeeId.length > 0)
    );

    return employeePicker.options.filter((option) => {
      const employee = employeePicker.items.find((item) => item.id === option.value);
      return (
        !assignedEmployeeIds.has(option.value) &&
        (!employee || employee.departmentId !== departmentId)
      );
    });
  }, [assignedEmployees, departmentId, employeePicker.items, employeePicker.options]);

  const selectedEmployee = useMemo(() => {
    if (pickedEmployee?.id === selectedEmployeeId) return pickedEmployee;
    return employeePicker.items.find((employee) => employee.id === selectedEmployeeId);
  }, [employeePicker.items, pickedEmployee, selectedEmployeeId]);

  const selectedEmployeeDepartmentName = selectedEmployee?.department?.name ?? 'another department';
  const shouldShowDepartmentReassignmentNotice =
    Boolean(selectedEmployee?.departmentId) && selectedEmployee?.departmentId !== departmentId;
  const hasSelectedEmployee = employeeOptions.some((option) => option.value === selectedEmployeeId);

  const resetSelections = () => {
    setSelectedEmployeeId('');
    setPickedEmployee(null);
    setPickedEmployeeOption(null);
    setEmployeeSearch('');
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
            <InfiniteSearchSelect
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={(value) => {
                setSelectedEmployeeId(value ?? '');
                setPickedEmployee(
                  value
                    ? (employeePicker.items.find((employee) => employee.id === value) ?? null)
                    : null
                );
              }}
              onOptionChange={setPickedEmployeeOption}
              selectedOption={pickedEmployeeOption}
              search={employeeSearch}
              onSearchChange={setEmployeeSearch}
              isLoading={employeePicker.isLoading}
              isFetchingNextPage={employeePicker.isFetchingNextPage}
              hasNextPage={employeePicker.hasNextPage}
              onFetchNextPage={employeePicker.fetchNextPage}
              placeholder="Search employees..."
              searchPlaceholder="Search employees..."
              emptyMessage="No unassigned employees found."
              loadingMessage="Loading employees..."
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
