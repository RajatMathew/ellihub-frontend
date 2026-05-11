import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';

interface DepartmentDeleteDialogProps {
  target: { id: string; name: string } | null;
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
    >
      Are you sure you want to delete <strong>{target?.name}</strong>? This action cannot be undone.
      All employee assignments will be removed.
    </ResourceDeleteDialog>
  );
}
