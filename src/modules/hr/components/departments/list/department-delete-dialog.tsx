import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';

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
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete Department"
      description={
        <>
          Are you sure you want to delete <strong>{target?.name}</strong>? This action cannot be
          undone. All employee assignments will be removed.
        </>
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
      variant="destructive"
      isPending={isPending}
    />
  );
}
