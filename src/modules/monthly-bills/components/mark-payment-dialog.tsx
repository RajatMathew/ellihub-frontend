import { useState } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { useQuickBooksStatusQuery } from '@/modules/integrations/hooks/quickbooks.hooks';
import { ManualPaymentForm } from '@/modules/monthly-bills/components/manual-payment-form';
import { MarkPaymentSummary } from '@/modules/monthly-bills/components/mark-payment-summary';
import { QuickBooksPaymentForm } from '@/modules/monthly-bills/components/quickbooks-payment-form';
import {
  getDefaultMarkPaymentMode,
  type MarkPaymentMode,
} from '@/modules/monthly-bills/lib/mark-payment-mode';
import type {
  MarkPaymentResult,
  MonthlyBillItem,
  MonthlyBillsPeriodMeta,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MarkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentMarked: (payment: MarkPaymentResult) => void;
  bill: MonthlyBillItem;
  amount: number;
  isReady?: boolean;
  period: MonthlyBillsPeriodMeta;
}

const DESCRIPTIONS: Record<MarkPaymentMode, string> = {
  QUICKBOOKS: 'Create the QuickBooks payment, then mark this bill paid in ElliHub.',
  MANUAL: 'Record a payment made outside QuickBooks - by check, wire or card.',
};

/**
 * Pays a bill's ready planned payment: through QuickBooks, or manually when it
 * was paid outside it (or QuickBooks is not connected).
 */
export function MarkPaymentDialog({
  open,
  onOpenChange,
  bill,
  amount,
  isReady: isReadyOverride,
  period,
  onPaymentMarked,
}: MarkPaymentDialogProps) {
  // Shares the route's status query: no request of its own.
  const statusQuery = useQuickBooksStatusQuery(open);
  const isQuickBooksConnected = statusQuery.data?.connection?.status === 'CONNECTED';
  const defaultMode = getDefaultMarkPaymentMode({
    isConnected: isQuickBooksConnected,
    isLoading: statusQuery.isLoading,
  });
  const [chosenMode, setChosenMode] = useState<MarkPaymentMode | null>(null);
  const quickBooksUnavailable = !statusQuery.isLoading && !isQuickBooksConnected;
  const mode = quickBooksUnavailable ? 'MANUAL' : (chosenMode ?? defaultMode);

  // Each opening starts from the default again.
  useResetOnChange(JSON.stringify([open, bill.purchaseOrder.id]), () => setChosenMode(null));

  // The backend only pays a planned payment that has been marked ready.
  const isReady = isReadyOverride ?? bill.plannedPayment?.isReady ?? false;
  const canSubmit = isReady && amount > 0;
  const formProps = {
    open,
    bill,
    canSubmit,
    period,
    onCancel: () => onOpenChange(false),
    onPaymentMarked,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Payment</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[mode]}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <MarkPaymentSummary
            amount={amount}
            vendorName={bill.purchaseOrder.vendor.name}
            poNumber={bill.purchaseOrder.poNumber}
            balance={bill.balance}
          />

          {!isReady && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Mark the bill as <span className="font-semibold">Ready</span> before recording a
              payment.
            </div>
          )}

          <div className="space-y-2">
            <Tabs value={mode} onValueChange={(value) => setChosenMode(value as MarkPaymentMode)}>
              <TabsList className="grid w-full grid-cols-2 sm:w-[360px]">
                <TabsTrigger value="QUICKBOOKS" disabled={quickBooksUnavailable}>
                  QuickBooks
                </TabsTrigger>
                <TabsTrigger value="MANUAL">Manual</TabsTrigger>
              </TabsList>
            </Tabs>
            {quickBooksUnavailable && (
              <p className="text-xs text-muted-foreground">
                QuickBooks is not connected, so this payment is recorded manually.
              </p>
            )}
          </div>
        </DialogBody>

        {mode === 'QUICKBOOKS' ? (
          <QuickBooksPaymentForm {...formProps} amount={amount} />
        ) : (
          <ManualPaymentForm {...formProps} />
        )}
      </DialogContent>
    </Dialog>
  );
}
