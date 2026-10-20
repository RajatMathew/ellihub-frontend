import { useState } from 'react';

import { ResourceDeleteDialog } from '@/app/components/resource-delete-dialog';
import { Button } from '@/app/components/ui/button';
import { formatCurrency } from '@/app/lib/helpers';
import { useDeleteManualPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { Trash2 } from 'lucide-react';

interface DeleteManualPaymentButtonProps {
  paymentId: string;
  amount?: number;
  poNumber: string;
}

/**
 * Takes back a payment recorded by hand - the one kind ElliHub alone owns. The
 * bill's paid total drops by it; the planned payment is not restored.
 */
export function DeleteManualPaymentButton({
  paymentId,
  amount,
  poNumber,
}: DeleteManualPaymentButtonProps) {
  const [open, setOpen] = useState(false);
  const deletePayment = useDeleteManualPaymentMutation();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        mode="icon"
        aria-label="Delete payment"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <ResourceDeleteDialog
        open={open}
        title="Delete payment?"
        isPending={deletePayment.isPending}
        onOpenChange={setOpen}
        onConfirm={() =>
          deletePayment.mutate(paymentId, {
            onSuccess: () => setOpen(false),
          })
        }
      >
        The {amount === undefined ? '' : `${formatCurrency(amount)} `}manual payment on {poNumber}{' '}
        will be removed and the bill&apos;s balance goes back up. The planned payment is not
        restored. This cannot be undone.
      </ResourceDeleteDialog>
    </>
  );
}
