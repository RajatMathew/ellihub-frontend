import { useEffect, useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Form } from '@/app/components/ui/form';
import { formatDateOnly } from '@/app/lib/dates';
import { BankAccountSelectField } from '@/modules/monthly-bills/components/bank-account-select-field';
import { MarkPaymentDateField } from '@/modules/monthly-bills/components/mark-payment-date-field';
import { MarkPaymentSummary } from '@/modules/monthly-bills/components/mark-payment-summary';
import { PaymentAmountField } from '@/modules/monthly-bills/components/payment-amount-field';
import { PaymentReferenceMemoFields } from '@/modules/monthly-bills/components/payment-reference-memo-fields';
import { useRecordPurchaseOrderManualPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  buildPoManualPaymentPayload,
  getPoPaymentDateBounds,
} from '@/modules/monthly-bills/lib/po-manual-payment';
import {
  createPoManualPaymentFormSchema,
  type PoManualPaymentFormData,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

export interface RecordPoPaymentTarget {
  id: string;
  poNumber: string;
  vendorName: string;
  /** What is left to pay: total plus approved SCOs, less payments. */
  balance: number;
  issuedAt?: string | null;
}

interface RecordPoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: RecordPoPaymentTarget;
}

/**
 * Records a payment made outside QuickBooks - by check, wire or card - from
 * the PO page, for the amount paid. Its date decides the Monthly Bills month
 * it counts toward - this month or an earlier one, back to the month the PO
 * was issued - and a planned payment for that month is reduced by the amount.
 */
export function RecordPoPaymentDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: RecordPoPaymentDialogProps) {
  // Recomputed on each opening, so a dialog left open over midnight still
  // starts on the right day the next time.
  const bounds = useMemo(
    () => (open ? getPoPaymentDateBounds(purchaseOrder.issuedAt) : null),
    [open, purchaseOrder.issuedAt]
  );
  const isPayable = bounds !== null;

  const schema = useMemo(
    () => createPoManualPaymentFormSchema(purchaseOrder.balance, bounds),
    [purchaseOrder.balance, bounds]
  );
  const form = useForm<PoManualPaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(purchaseOrder.balance, bounds?.defaultTxnDate ?? ''),
  });
  const amount = useWatch({ control: form.control, name: 'amount' }) ?? 0;

  const recordPayment = useRecordPurchaseOrderManualPaymentMutation(purchaseOrder.id, {
    onSuccess: () => onOpenChange(false),
  });

  // Each opening starts again on today, for the whole balance.
  useEffect(() => {
    if (!open) return;
    form.reset(emptyValues(purchaseOrder.balance, bounds?.defaultTxnDate ?? ''));
  }, [bounds, form, open, purchaseOrder.balance, purchaseOrder.id]);

  const handleSubmit = (values: PoManualPaymentFormData) => {
    if (!isPayable) return;
    recordPayment.mutate(buildPoManualPaymentPayload(values));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment made outside QuickBooks - by check, wire or card.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
            <DialogBody className="space-y-5">
              <MarkPaymentSummary
                amount={amount}
                vendorName={purchaseOrder.vendorName}
                poNumber={purchaseOrder.poNumber}
                balance={purchaseOrder.balance}
              />

              {bounds ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PaymentAmountField control={form.control} name="amount" />
                  <MarkPaymentDateField
                    control={form.control}
                    name="txnDate"
                    min={bounds.minTxnDate}
                    max={bounds.maxTxnDate}
                    description={`Counts toward Monthly Bills for this date's month. From ${formatDateOnly(bounds.minTxnDate)} to ${formatDateOnly(bounds.maxTxnDate)}.`}
                  />
                </div>
              ) : (
                <p role="alert" className="text-sm text-destructive">
                  This PO has no issue date, so it cannot be paid yet.
                </p>
              )}

              <BankAccountSelectField control={form.control} name="bankAccountId" enabled={open} />

              <PaymentReferenceMemoFields control={form.control} />
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isPayable || recordPayment.isPending}
              >
                <CircleCheck className="size-4" />
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(balance: number, txnDate: string): PoManualPaymentFormData {
  return { amount: balance, txnDate, bankAccountId: '', reference: '', memo: '' };
}
