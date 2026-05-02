import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';

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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Time Off Request"
      description={
        <>
          Are you sure you want to delete the time off request for <strong>{name}</strong>? This
          action cannot be undone.
        </>
      }
      confirmLabel="Delete Request"
      onConfirm={onConfirm}
      variant="destructive"
      isPending={isPending}
    />
  );
}
