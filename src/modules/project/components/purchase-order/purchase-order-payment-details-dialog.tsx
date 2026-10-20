import { InfoRow } from '@/app/components/info-row';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { usePOPaymentDetailQuery } from '@/modules/project/hooks/purchase-order/purchase-order.hooks';
import {
  describePaymentSource,
  describeQuickBooksSync,
} from '@/modules/project/lib/purchase-order-payment-detail';
import type { POPaymentDetail } from '@/modules/project/schemas/purchase-order';
import { ExternalLink } from 'lucide-react';

interface PurchaseOrderPaymentDetailsDialogProps {
  purchaseOrderId: string;
  /** The payment to show; null keeps the dialog closed. */
  paymentId: string | null;
  onClose: () => void;
}

/** Everything stored about one PO payment, loaded when it is opened. */
export function PurchaseOrderPaymentDetailsDialog({
  purchaseOrderId,
  paymentId,
  onClose,
}: PurchaseOrderPaymentDetailsDialogProps) {
  const detailQuery = usePOPaymentDetailQuery(purchaseOrderId, paymentId);
  const payment = detailQuery.data;

  return (
    <Dialog open={paymentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            {payment
              ? `${formatCurrency(payment.amount)} to ${payment.vendorName} on ${payment.poNumber}`
              : 'Loading payment...'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {detailQuery.isError ? (
            <QueryErrorState
              title="Could not load the payment"
              onRetry={() => void detailQuery.refetch()}
            />
          ) : !payment ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <PaymentDetailsBody payment={payment} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDetailsBody({ payment }: { payment: POPaymentDetail }) {
  const source = describePaymentSource(payment.source);
  const quickBooks = payment.quickBooks;

  return (
    <>
      <div className="space-y-2.5">
        <InfoRow label="Amount">{formatCurrency(payment.amount)}</InfoRow>
        <InfoRow label="Paid">{formatDateOnly(payment.txnDate)}</InfoRow>
        <InfoRow label="Type">
          <Badge variant={source.variant} appearance="light" size="sm">
            {source.label}
          </Badge>
        </InfoRow>
        <InfoRow label="Reference">{payment.reference || '-'}</InfoRow>
        {payment.checkNumber ? <InfoRow label="Check no.">{payment.checkNumber}</InfoRow> : null}
        <InfoRow label="Bank account">{payment.bankAccountName || '-'}</InfoRow>
        {payment.recordedByName ? (
          <InfoRow label={payment.source === 'QUICKBOOKS' ? 'Started by' : 'Recorded by'}>
            {payment.recordedByName}
          </InfoRow>
        ) : null}
        <InfoRow label={payment.source === 'IMPORT' ? 'Imported' : 'Recorded'}>
          {formatDate(payment.recordedAt)}
        </InfoRow>
      </div>

      {payment.memo ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Memo</p>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{payment.memo}</p>
        </div>
      ) : null}

      {quickBooks ? (
        <>
          <Separator />
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              QuickBooks
            </p>
            <InfoRow label="Vendor">{quickBooks.vendorName || '-'}</InfoRow>
            <InfoRow label="Sync">
              {describeQuickBooksSync(quickBooks.trackingStatus, quickBooks.openConflictCount)}
            </InfoRow>
            <InfoRow label="Print">
              {quickBooks.printStatus || (quickBooks.printLater ? 'To be printed' : '-')}
            </InfoRow>
            {quickBooks.lines.length > 0 ? (
              <div className="space-y-1.5 rounded-md border border-border p-3">
                {quickBooks.lines.map((line, index) => (
                  <InfoRow key={index} label={line.categoryName || 'Uncategorized'}>
                    {formatCurrency(line.amount)}
                  </InfoRow>
                ))}
              </div>
            ) : null}
            {quickBooks.transactionUrl ? (
              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                <a href={quickBooks.transactionUrl} target="_blank" rel="noopener noreferrer">
                  Open in QuickBooks
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
