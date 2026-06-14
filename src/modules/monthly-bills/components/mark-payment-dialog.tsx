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
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksVendorsQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import { MarkPaymentReferenceSelect } from '@/modules/monthly-bills/components/mark-payment-reference-select';
import { MarkPaymentSummary } from '@/modules/monthly-bills/components/mark-payment-summary';
import { MarkPaymentVendorField } from '@/modules/monthly-bills/components/mark-payment-vendor-field';
import { useMarkPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { findVendorMatch } from '@/modules/monthly-bills/lib/monthly-bills-vendor-match';
import {
  markPaymentFormSchema,
  type MarkPaymentFormData,
  type MonthlyBillItem,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface MarkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: MonthlyBillItem;
  amount: number;
  month: number;
  year: number;
}

export function MarkPaymentDialog({
  open,
  onOpenChange,
  bill,
  amount,
  month,
  year,
}: MarkPaymentDialogProps) {
  const vendorName = bill.purchaseOrder.vendor.name;
  const poNumber = bill.purchaseOrder.poNumber;

  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const vendorsQuery = useQuickBooksVendorsQuery(open);

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
  const vendorMatch = useMemo(() => findVendorMatch(vendors, vendorName), [vendors, vendorName]);

  const markPayment = useMarkPaymentMutation();

  const form = useForm<MarkPaymentFormData>({
    resolver: zodResolver(markPaymentFormSchema),
    defaultValues: { qbVendorId: '', bankAccountId: '', categoryId: '' },
  });

  // Default the mapping to the suggested QuickBooks vendor once reference data loads, without
  // overriding a choice the user has already made. Values are QuickBooks-native ids (qbId).
  useEffect(() => {
    if (vendorMatch && !form.getValues('qbVendorId')) {
      form.setValue('qbVendorId', vendorMatch.vendor.qbId);
    }
  }, [vendorMatch, form]);

  // The server stamps the transaction date when posting; shown read-only for context.
  const paymentDate = useMemo(() => format(new Date(), 'MMM d, yyyy'), []);

  // The backend only posts a payment for a planned payment that has been marked ready.
  const isReady = bill.plannedPayment?.isReady ?? false;
  const canSubmit = isReady && amount > 0 && !markPayment.isPending;

  const handleSubmit = (values: MarkPaymentFormData) => {
    markPayment.mutate(
      {
        purchaseOrderId: bill.purchaseOrder.id,
        month,
        year,
        ...values,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Payment</DialogTitle>
          <DialogDescription>
            Create the QuickBooks payment, then mark this bill paid in ElliHub.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
            <DialogBody className="space-y-5">
              <MarkPaymentSummary
                amount={amount}
                vendorName={vendorName}
                poNumber={poNumber}
                balance={bill.balance}
              />

              {!isReady && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  Mark the bill as <span className="font-semibold">Ready</span> before recording a
                  payment.
                </div>
              )}

              <MarkPaymentVendorField
                control={form.control}
                vendors={vendors}
                vendorMatch={vendorMatch}
                vendorName={vendorName}
                isLoading={vendorsQuery.isLoading}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MarkPaymentReferenceSelect
                  control={form.control}
                  name="bankAccountId"
                  label="Bank Account"
                  options={bankAccountsQuery.data ?? []}
                  isLoading={bankAccountsQuery.isLoading}
                  placeholder="Select bank account"
                />

                <MarkPaymentReferenceSelect
                  control={form.control}
                  name="categoryId"
                  label="Category"
                  options={categoriesQuery.data ?? []}
                  isLoading={categoriesQuery.isLoading}
                  placeholder="Select category"
                />

                <div className="space-y-1.5">
                  <Label htmlFor="mark-payment-paid-date">Paid Date</Label>
                  <Input id="mark-payment-paid-date" value={paymentDate} readOnly disabled />
                  <p className="text-xs text-muted-foreground">
                    Stamped automatically when posted.
                  </p>
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                <CreditCard className="size-4" />
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
