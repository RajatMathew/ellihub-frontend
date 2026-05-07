import { useMemo, useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import { useRemovePOQuickBooksPaymentMutation } from '@/modules/project/hooks/purchase-order';
import type { POQuickBooksPayment } from '@/modules/project/schemas/purchase-order';
import { Banknote, Plus, Trash2 } from 'lucide-react';

import { PurchaseOrderAddQuickBooksPaymentDialog } from './purchase-order-add-quickbooks-payment-dialog';

type PurchaseOrderPaymentHistoryCardProps = {
  purchaseOrderId: string;
  payments: POQuickBooksPayment[];
  isLoading: boolean;
};

function getPaymentAmount(payment: POQuickBooksPayment) {
  if (!payment.totalAmount) return '-';
  return formatCurrency(payment.totalAmount);
}

export function PurchaseOrderPaymentHistoryCard({
  purchaseOrderId,
  payments,
  isLoading,
}: PurchaseOrderPaymentHistoryCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<POQuickBooksPayment | null>(null);
  const removePayment = useRemovePOQuickBooksPaymentMutation();
  const paymentTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.totalAmount ?? 0), 0),
    [payments]
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              PO Payment History ({payments.length})
            </CardTitle>
            {paymentTotal > 0 && (
              <span className="text-xs font-semibold text-muted-foreground">
                {formatCurrency(paymentTotal)}
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" />
            Add payment
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ProjectInlineListLoading rows={2} rowClassName="h-20" />
          ) : payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="success" appearance="light" size="sm">
                          {payment.entity}
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {payment.displayName || payment.docNumber || payment.transactionId}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Doc: {payment.docNumber ?? '-'}</span>
                        <span>{payment.txnDate ? formatDate(payment.txnDate) : '-'}</span>
                        {payment.privateNote && (
                          <span className="truncate">{payment.privateNote}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="font-semibold tabular-nums">
                          {getPaymentAmount(payment)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {payment.currency ?? 'USD'}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        mode="icon"
                        variant="ghost"
                        aria-label="Remove QuickBooks payment"
                        onClick={() => setRemoveTarget(payment)}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Banknote className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No QuickBooks payments linked to this purchase order.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseOrderAddQuickBooksPaymentDialog
        purchaseOrderId={purchaseOrderId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove QuickBooks Payment"
        description={
          <>
            Remove{' '}
            <strong>
              {removeTarget?.docNumber ?? removeTarget?.displayName ?? 'this payment'}
            </strong>{' '}
            from this purchase order?
          </>
        }
        confirmLabel="Remove payment"
        variant="destructive"
        isPending={removePayment.isPending}
        onConfirm={() => {
          if (!removeTarget) return;
          removePayment.mutate(
            { poId: purchaseOrderId, paymentId: removeTarget.id },
            { onSuccess: () => setRemoveTarget(null) }
          );
        }}
      />
    </>
  );
}
