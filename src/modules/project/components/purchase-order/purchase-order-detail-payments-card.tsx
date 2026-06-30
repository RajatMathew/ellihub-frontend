import { CreditCard, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type { POPayment } from '@/modules/project/schemas/purchase-order';

interface PurchaseOrderDetailPaymentsCardProps {
  payments: POPayment[];
}

export function PurchaseOrderDetailPaymentsCard({
  payments,
}: PurchaseOrderDetailPaymentsCardProps) {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Payments ({payments.length})
        </CardTitle>
        {totalPaid > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {formatCurrency(totalPaid)}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.transactionUrl ? (
                        <a
                          href={payment.transactionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {payment.transactionId ?? 'Payment'}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium">
                          {payment.transactionId ?? 'Payment'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Paid: {payment.txnDate ? formatDate(payment.txnDate) : '-'}
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="font-semibold tabular-nums">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                </div>
              </div>
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
