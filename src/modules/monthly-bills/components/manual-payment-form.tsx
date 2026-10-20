import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { DialogBody, DialogFooter } from '@/app/components/ui/dialog';
import { Form } from '@/app/components/ui/form';
import { BankAccountSelectField } from '@/modules/monthly-bills/components/bank-account-select-field';
import { MarkPaymentDateField } from '@/modules/monthly-bills/components/mark-payment-date-field';
import { PaymentReferenceMemoFields } from '@/modules/monthly-bills/components/payment-reference-memo-fields';
import { useMarkManualPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { buildManualPaymentPayload } from '@/modules/monthly-bills/lib/mark-payment-mode';
import {
  markManualPaymentFormSchema,
  type MarkManualPaymentFormData,
  type MarkPaymentResult,
  type MonthlyBillItem,
  type MonthlyBillsPeriodMeta,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ManualPaymentFormProps {
  open: boolean;
  bill: MonthlyBillItem;
  canSubmit: boolean;
  period: MonthlyBillsPeriodMeta;
  onCancel: () => void;
  onPaymentMarked: (payment: MarkPaymentResult) => void;
}

/**
 * Records a payment made outside QuickBooks - by check, wire or card - so the
 * bill shows it paid. Nothing is sent to QuickBooks.
 */
export function ManualPaymentForm({
  open,
  bill,
  canSubmit,
  period,
  onCancel,
  onPaymentMarked,
}: ManualPaymentFormProps) {
  const markPayment = useMarkManualPaymentMutation({ onSuccess: onPaymentMarked });

  const defaultValues: MarkManualPaymentFormData = {
    txnDate: period.defaultTxnDate,
    bankAccountId: '',
    reference: '',
    memo: '',
  };
  const form = useForm<MarkManualPaymentFormData>({
    resolver: zodResolver(markManualPaymentFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ txnDate: period.defaultTxnDate, bankAccountId: '', reference: '', memo: '' });
  }, [bill.purchaseOrder.id, form, open, period.defaultTxnDate]);

  const handleSubmit = (values: MarkManualPaymentFormData) => {
    markPayment.mutate(
      buildManualPaymentPayload(values, {
        purchaseOrderId: bill.purchaseOrder.id,
        month: period.month,
        year: period.year,
      })
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
        <DialogBody className="space-y-5 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BankAccountSelectField control={form.control} name="bankAccountId" enabled={open} />

            <MarkPaymentDateField
              control={form.control}
              name="txnDate"
              min={period.minTxnDate}
              max={period.maxTxnDate}
            />
          </div>

          <PaymentReferenceMemoFields control={form.control} />
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || markPayment.isPending}>
            <CircleCheck className="size-4" />
            Mark Paid
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
