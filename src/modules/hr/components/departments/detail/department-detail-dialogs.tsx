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
  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Delete Department"
        description={
          <>
            Are you sure you want to delete <strong>{department.name}</strong>? This action cannot
            be undone. All employee assignments will be removed.
          </>
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        variant="destructive"
        isPending={isDeletePending}
      />

      <EmployeeAssignDialog
        open={assignOpen}
        onOpenChange={onAssignOpenChange}
        departmentId={department.id}
      />
    </>
  );
}
