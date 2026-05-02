import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';

interface EmployeeDeleteDialogProps {
  target: { id: string; name: string } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function EmployeeDeleteDialog({
  target,
  isPending,
  onOpenChange,
  onConfirm,
}: EmployeeDeleteDialogProps) {
  return (
    <ResourceDeleteDialog
      open={Boolean(target)}
      onOpenChange={onOpenChange}
      title="Delete Employee"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      isPending={isPending}
    >
      Are you sure you want to delete <strong>{target?.name}</strong>? This action will remove the
      employee from all departments and projects.
    </ResourceDeleteDialog>
  );
}
