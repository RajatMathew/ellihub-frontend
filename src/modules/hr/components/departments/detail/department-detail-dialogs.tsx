import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { EmployeeAssignDialog } from '@/modules/hr/components/departments/employee-assign-dialog';
import type { DepartmentDetail } from '@/modules/hr/schemas/department.schema';

interface DepartmentDetailDialogsProps {
  department: DepartmentDetail;
  deleteOpen: boolean;
  assignOpen: boolean;
  isDeletePending: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onAssignOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

export function DepartmentDetailDialogs({
  department,
  deleteOpen,
  assignOpen,
  isDeletePending,
  onDeleteOpenChange,
  onAssignOpenChange,
  onConfirmDelete,
}: DepartmentDetailDialogsProps) {
  const employeeCount = department.employees?.length ?? 0;
  const hasEmployees = employeeCount > 0;

  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Delete Department"
        description={
          hasEmployees ? (
            <>
              <strong>{department.name}</strong> cannot be deleted while it has {employeeCount}{' '}
              {employeeCount === 1 ? 'employee' : 'employees'} assigned. Remove the employees from
              this department first.
            </>
          ) : (
            <>
              Are you sure you want to delete <strong>{department.name}</strong>? This action cannot
              be undone.
            </>
          )
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        variant="destructive"
        isPending={isDeletePending}
        confirmDisabled={hasEmployees}
      />

      <EmployeeAssignDialog
        open={assignOpen}
        onOpenChange={onAssignOpenChange}
        departmentId={department.id}
        departmentName={department.name}
        assignedEmployees={department.employees ?? []}
      />
    </>
  );
}
