import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';
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
    <ResourceDeleteDialog
      open={!!costCode}
      onOpenChange={onOpenChange}
      title="Delete Cost Code"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      isPending={isPending}
    >
      This will permanently delete <strong>{costCode?.name}</strong>. This cannot be undone.
    </ResourceDeleteDialog>
  );
}
