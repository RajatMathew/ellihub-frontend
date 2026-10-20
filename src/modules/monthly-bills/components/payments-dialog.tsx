import { useState } from 'react';

import { PaymentItem } from '@/app/components/payment-item';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useAccess } from '@/app/contexts/access-context';
import { formatCurrency } from '@/app/lib/helpers';
import { DeleteManualPaymentButton } from '@/modules/monthly-bills/components/delete-manual-payment-button';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { PurchaseOrderPaymentDetailsDialog } from '@/modules/project/components/purchase-order/purchase-order-payment-details-dialog';

interface PaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: MonthlyBillItem['payments'];
  poNumber: string;
  purchaseOrderId: string;
}

export function PaymentsDialog({
  open,
  onOpenChange,
  payments,
  poNumber,
  purchaseOrderId,
}: PaymentsDialogProps) {
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const total = sumMonthlyBillMoney(payments.map((payment) => payment.amount));
  // The same permission that records one; the server also limits it to admins,
  // accountants and A/P, as it does recording.
  const canDeleteManualPayments = useAccess().can('monthlyBills', 'mark-payment');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payments</DialogTitle>
          <DialogDescription>
            {payments.length} payment{payments.length === 1 ? '' : 's'} recorded for {poNumber}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex min-h-0 flex-1 flex-col gap-4">
          {payments.length > 0 ? (
            <ul className="min-h-0 space-y-2 overflow-y-auto pr-1">
              {payments.map((payment) => (
                <li key={payment.id}>
                  <PaymentItem
                    payment={payment}
                    onOpen={() => setOpenPaymentId(payment.id)}
                    manualAction={
                      canDeleteManualPayments ? (
                        <DeleteManualPaymentButton
                          paymentId={payment.id}
                          amount={payment.amount}
                          poNumber={poNumber}
                        />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No payments have been recorded for this purchase order.
            </p>
          )}

          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </DialogBody>
      </DialogContent>
      <PurchaseOrderPaymentDetailsDialog
        purchaseOrderId={purchaseOrderId}
        paymentId={openPaymentId}
        onClose={() => setOpenPaymentId(null)}
      />
    </Dialog>
  );
}
