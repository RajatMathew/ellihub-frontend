import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';

interface DepartmentDeleteDialogProps {
  target: { id: string; name: string; employeeCount?: number } | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DepartmentDeleteDialog({
  target,
  isPending,
  onClose,
  onConfirm,
}: DepartmentDeleteDialogProps) {
  const employeeCount = target?.employeeCount ?? 0;
  const hasEmployees = employeeCount > 0;

  return (
    <ResourceDeleteDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete Department"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      isPending={isPending}
      confirmDisabled={hasEmployees}
    >
      {hasEmployees ? (
        <>
          <strong>{target?.name}</strong> cannot be deleted while it has {employeeCount}{' '}
          {employeeCount === 1 ? 'employee' : 'employees'} assigned. Remove the employees from this
          department first.
        </>
      ) : (
        <>
          Are you sure you want to delete <strong>{target?.name}</strong>? This action cannot be
          undone.
        </>
      )}
    </ResourceDeleteDialog>
  );
}
