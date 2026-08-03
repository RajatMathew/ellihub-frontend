import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { formatCurrency } from '@/app/lib/helpers';
import { QuickBooksPaymentItem } from '@/modules/integrations/components/quickbooks-payment-item';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface PaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: MonthlyBillItem['payments'];
  poNumber: string;
}

export function PaymentsDialog({ open, onOpenChange, payments, poNumber }: PaymentsDialogProps) {
  const total = sumMonthlyBillMoney(payments.map((payment) => payment.amount));

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
                  <QuickBooksPaymentItem
                    amount={payment.amount}
                    txnDate={payment.txnDate}
                    checkNumber={payment.checkNumber}
                    transactionUrl={payment.transactionUrl}
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
    </Dialog>
  );
}
