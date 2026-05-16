import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

interface RFQListConfirmDialogsProps {
  deleteTarget: RFQListItem | null;
  isDeletePending: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

export function RFQListConfirmDialogs({
  deleteTarget,
  isDeletePending,
  onCloseDelete,
  onConfirmDelete,
}: RFQListConfirmDialogsProps) {
  return (
    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) onCloseDelete();
      }}
      title="Delete RFQ"
      description={
        <>
          This will permanently delete{' '}
          <strong>{deleteTarget?.rfqNumber ?? deleteTarget?.title}</strong>. This cannot be undone.
        </>
      }
      confirmLabel="Delete"
      onConfirm={onConfirmDelete}
      variant="destructive"
      isPending={isDeletePending}
    />
  );
}
