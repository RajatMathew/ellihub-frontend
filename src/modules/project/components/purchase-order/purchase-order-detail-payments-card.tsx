import { useState } from 'react';

import { PaymentItem } from '@/app/components/payment-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { DeleteManualPaymentButton } from '@/modules/monthly-bills/components/delete-manual-payment-button';
import type { POPayment } from '@/modules/project/schemas/purchase-order';
import { CreditCard } from 'lucide-react';

import { PurchaseOrderPaymentDetailsDialog } from './purchase-order-payment-details-dialog';

interface PurchaseOrderDetailPaymentsCardProps {
  purchaseOrderId: string;
  payments: POPayment[];
  poNumber: string;
  /** Payments recorded by hand can be taken back by whoever may mark payments. */
  canDeleteManualPayments?: boolean;
}

export function PurchaseOrderDetailPaymentsCard({
  purchaseOrderId,
  payments,
  poNumber,
  canDeleteManualPayments = false,
}: PurchaseOrderDetailPaymentsCardProps) {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);

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
              <PaymentItem
                key={payment.id}
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
      <PurchaseOrderPaymentDetailsDialog
        purchaseOrderId={purchaseOrderId}
        paymentId={openPaymentId}
        onClose={() => setOpenPaymentId(null)}
      />
    </Card>
  );
}
