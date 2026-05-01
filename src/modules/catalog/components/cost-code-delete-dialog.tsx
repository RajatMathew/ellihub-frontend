import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';

interface CostCodeDeleteDialogProps {
  costCode: CostCode | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CostCodeDeleteDialog({
  costCode,
  isPending,
  onOpenChange,
  onConfirm,
}: CostCodeDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={!!costCode}
      onOpenChange={onOpenChange}
      title="Delete Cost Code"
      description={
        <>
          This will permanently delete <strong>{costCode?.name}</strong>. This cannot be undone.
        </>
      }
      confirmLabel="Delete"
      onConfirm={onConfirm}
      variant="destructive"
      isPending={isPending}
    />
  );
}
