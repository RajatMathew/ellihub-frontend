import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';

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
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={onOpenChange}
      title="Delete Employee"
      description={
        <>
          Are you sure you want to delete <strong>{target?.name}</strong>? This action will remove
          the employee from all departments and projects.
        </>
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
      variant="destructive"
      isPending={isPending}
    />
  );
}
