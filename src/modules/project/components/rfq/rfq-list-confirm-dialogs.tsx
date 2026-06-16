import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

interface RFQListConfirmDialogsProps {
  deleteTarget: RFQListItem | null;
  voidTarget: RFQListItem | null;
  voidReason: string;
  isDeletePending: boolean;
  isVoidPending: boolean;
  onCloseDelete: () => void;
  onCloseVoid: () => void;
  onConfirmDelete: () => void;
  onConfirmVoid: () => void;
  onVoidReasonChange: (value: string) => void;
}

export function RFQListConfirmDialogs({
  deleteTarget,
  voidTarget,
  voidReason,
  isDeletePending,
  isVoidPending,
  onCloseDelete,
  onCloseVoid,
  onConfirmDelete,
  onConfirmVoid,
  onVoidReasonChange,
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
            This will delete <strong>{deleteTarget?.rfqNumber ?? deleteTarget?.title}</strong>.
          </>
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        variant="destructive"
        isPending={isDeletePending}
      />

      <Dialog
        open={!!voidTarget}
        onOpenChange={(open) => {
          if (!open) onCloseVoid();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide a reason for voiding{' '}
              <strong>{voidTarget?.rfqNumber ?? voidTarget?.title}</strong>.
            </p>
            <Textarea
              placeholder="Void reason..."
              value={voidReason}
              onChange={(event) => onVoidReasonChange(event.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseVoid}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={voidReason.length < 1 || isVoidPending}
              onClick={onConfirmVoid}
            >
              {isVoidPending ? 'Voiding...' : 'Void RFQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
