import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ExternalLink } from 'lucide-react';

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
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payments</DialogTitle>
          <DialogDescription>
            {payments.length} payment{payments.length === 1 ? '' : 's'} recorded for {poNumber}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ul className="divide-y divide-border rounded-md border border-border">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {payment.amount !== undefined ? formatCurrency(payment.amount) : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {payment.txnDate
                      ? formatDate(payment.txnDate, {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'No date'}
                  </span>
                </div>
                {payment.transactionUrl ? (
                  <a
                    href={payment.transactionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {payment.transactionId ?? 'View'}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {payment.transactionId ?? '—'}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
