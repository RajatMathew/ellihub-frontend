import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';

interface PTODeleteDialogProps {
  open: boolean;
  name: string | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PTODeleteDialog({
  open,
  name,
  isPending,
  onOpenChange,
  onConfirm,
}: PTODeleteDialogProps) {
  return (
    <ResourceDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Time Off Request"
      confirmLabel="Delete Request"
      onConfirm={onConfirm}
      isPending={isPending}
    >
      Are you sure you want to delete the time off request for <strong>{name}</strong>? This action
      cannot be undone.
    </ResourceDeleteDialog>
  );
}
