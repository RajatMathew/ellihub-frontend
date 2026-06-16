import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { DocumentAddDialog } from '@/modules/hr/components/employees/document-add-dialog';
import type { Employee } from '@/modules/hr/schemas/employee.schema';

interface EmployeeDetailDialogsProps {
  employee: Employee;
  deleteOpen: boolean;
  addDocumentOpen: boolean;
  isDeleting: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onAddDocumentOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function EmployeeDetailDialogs({
  employee,
  deleteOpen,
  addDocumentOpen,
  isDeleting,
  onDeleteOpenChange,
  onAddDocumentOpenChange,
  onDelete,
}: EmployeeDetailDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Deactivate Employee Account"
        description={
          <>
            Are you sure you want to deactivate <strong>{employee.name}</strong>? They will lose
            access to the system and their role assignments will be archived.
          </>
        }
        confirmLabel="Deactivate"
        onConfirm={onDelete}
        variant="destructive"
        isPending={isDeleting}
      />

      <DocumentAddDialog
        open={addDocumentOpen}
        onOpenChange={onAddDocumentOpenChange}
        employeeId={employee.id}
      />
    </>
  );
}
