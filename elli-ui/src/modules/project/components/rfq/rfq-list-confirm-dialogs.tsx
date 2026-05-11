import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

interface RFQListConfirmDialogsProps {
  deleteTarget: RFQListItem | null;
  createPOTarget: RFQListItem | null;
  isDeletePending: boolean;
  isCreatePOPending: boolean;
  onCloseDelete: () => void;
  onCloseCreatePO: () => void;
  onConfirmDelete: () => void;
  onConfirmCreatePO: () => void;
}

export function RFQListConfirmDialogs({
  deleteTarget,
  createPOTarget,
  isDeletePending,
  isCreatePOPending,
  onCloseDelete,
  onCloseCreatePO,
  onConfirmDelete,
  onConfirmCreatePO,
}: RFQListConfirmDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) onCloseDelete();
        }}
        title="Delete RFQ"
        description={
          <>
            This will permanently delete{' '}
            <strong>{deleteTarget?.rfqNumber ?? deleteTarget?.title}</strong>. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        variant="destructive"
        isPending={isDeletePending}
      />

      <ConfirmDialog
        open={!!createPOTarget}
        onOpenChange={(open) => {
          if (!open) onCloseCreatePO();
        }}
        title="Create PO from RFQ"
        description={
          <>
            Create a purchase order from awarded RFQ{' '}
            <strong>{createPOTarget?.rfqNumber ?? createPOTarget?.title}</strong>?
          </>
        }
        confirmLabel="Create PO"
        onConfirm={onConfirmCreatePO}
        isPending={isCreatePOPending}
      />
    </>
  );
}
