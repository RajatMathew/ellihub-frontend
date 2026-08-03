import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { QuickBooksPaymentItem } from '@/modules/integrations/components/quickbooks-payment-item';
import type { POPayment } from '@/modules/project/schemas/purchase-order';
import { CreditCard } from 'lucide-react';

interface PurchaseOrderDetailPaymentsCardProps {
  payments: POPayment[];
}

export function PurchaseOrderDetailPaymentsCard({
  payments,
}: PurchaseOrderDetailPaymentsCardProps) {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <Card>
      <CardHeader className="items-start">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-xs font-semibold uppercase tracking-normal">
            Payments
          </CardTitle>
          <p className="text-xs text-card-header-foreground/75">
            {payments.length} payment{payments.length === 1 ? '' : 's'} recorded
          </p>
        </div>
        {totalPaid > 0 ? (
          <div className="shrink-0 text-right">
            <p className="text-xs text-card-header-foreground/75">Total paid</p>
            <p className="text-sm font-semibold tabular-nums text-card-header-foreground">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <QuickBooksPaymentItem
                key={payment.id}
                amount={payment.amount}
                txnDate={payment.txnDate}
                checkNumber={payment.checkNumber}
                transactionUrl={payment.transactionUrl}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CreditCard className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No payments recorded for this purchase order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
