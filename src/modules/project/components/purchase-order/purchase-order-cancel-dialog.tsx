import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';

interface PurchaseOrderCancelDialogProps {
  open: boolean;
  purchaseOrderLabel: string;
  reason: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function PurchaseOrderCancelDialog({
  open,
  purchaseOrderLabel,
  reason,
  isPending,
  onOpenChange,
  onReasonChange,
  onConfirm,
}: PurchaseOrderCancelDialogProps) {
  const isReasonMissing = reason.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Purchase Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Provide a reason for cancelling <strong>{purchaseOrderLabel}</strong>.
          </p>
          <Textarea
            placeholder="Reason for cancellation..."
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
          />
          {isReasonMissing && (
            <p className="text-xs text-destructive">Cancellation reason is required.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={isReasonMissing || isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Cancelling...' : 'Cancel PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
