import { useEffect, useMemo, useState } from 'react';

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
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksVendorOptions,
  useUnmapQuickBooksVendorMutation,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type {
  QuickBooksPayee,
  QuickBooksVendorMapping,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { CreateQuickBooksVendorDialog } from '@/modules/monthly-bills/components/create-quickbooks-vendor-dialog';
import { MarkPaymentReferenceSelect } from '@/modules/monthly-bills/components/mark-payment-reference-select';
import { MarkPaymentSummary } from '@/modules/monthly-bills/components/mark-payment-summary';
import { MarkPaymentVendorField } from '@/modules/monthly-bills/components/mark-payment-vendor-field';
import { useMarkPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { findVendorMatch } from '@/modules/monthly-bills/lib/monthly-bills-vendor-match';
import {
  markPaymentFormSchema,
  type MarkPaymentFormData,
  type MarkPaymentResult,
  type MonthlyBillItem,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface MarkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentMarked: (payment: MarkPaymentResult) => void;
  bill: MonthlyBillItem;
  amount: number;
  isReady?: boolean;
  month: number;
  year: number;
}

function quickBooksPayeeToOption(vendor: QuickBooksPayee): InfiniteSearchSelectOption {
  const description = [vendor.companyName, vendor.primaryEmail ?? vendor.primaryPhone]
    .filter(Boolean)
    .join(' | ');

  return {
    value: vendor.qbId,
    label: vendor.displayName,
    description: description || undefined,
  };
}

function quickBooksMappingToOption(
  mapping: QuickBooksVendorMapping | null
): InfiniteSearchSelectOption | undefined {
  if (!mapping) return undefined;

  const description = [mapping.companyName, mapping.primaryEmail ?? mapping.primaryPhone]
    .filter(Boolean)
    .join(' | ');

  return {
    value: mapping.qbVendorId,
    label: mapping.displayName,
    description: description || undefined,
  };
}

export function MarkPaymentDialog({
  open,
  onOpenChange,
  bill,
  amount,
  isReady: isReadyOverride,
  month,
  year,
  onPaymentMarked,
}: MarkPaymentDialogProps) {
  const vendorName = bill.purchaseOrder.vendor.name;
  const poNumber = bill.purchaseOrder.poNumber;
  const [vendorSearchInput, setVendorSearchInput] = useState('');
  const vendorSearch = useDebouncedValue(vendorSearchInput.trim(), 250);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [createdVendorOption, setCreatedVendorOption] = useState<
    InfiniteSearchSelectOption | undefined
  >();
  const [mappingOverride, setMappingOverride] = useState<
    QuickBooksVendorMapping | null | undefined
  >();
  const sourceMapping = bill.purchaseOrder.vendor.quickBooksMapping ?? null;
  const currentMapping = mappingOverride === undefined ? sourceMapping : mappingOverride;
  const selectedMappingOption = useMemo(
    () => quickBooksMappingToOption(currentMapping),
    [currentMapping]
  );
  const selectedVendorOption = selectedMappingOption ?? createdVendorOption;

  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const vendorOptions = useQuickBooksVendorOptions({
    search: vendorSearch,
    selectedOption: selectedVendorOption,
    enabled: open,
  });
  const vendorMatch = useMemo(
    () => (currentMapping ? null : findVendorMatch(vendorOptions.vendors, vendorName)),
    [currentMapping, vendorOptions.vendors, vendorName]
  );

  const markPayment = useMarkPaymentMutation();
  const unmapVendor = useUnmapQuickBooksVendorMutation();

  const form = useForm<MarkPaymentFormData>({
    resolver: zodResolver(markPaymentFormSchema),
    defaultValues: {
      qbVendorId: sourceMapping?.qbVendorId ?? '',
      bankAccountId: '',
      categoryId: '',
      saveVendorMapping: false,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (currentMapping) {
      form.setValue('qbVendorId', currentMapping.qbVendorId, { shouldValidate: true });
      form.setValue('saveVendorMapping', false);
      return;
    }

    if (vendorMatch && !form.getValues('qbVendorId')) {
      form.setValue('qbVendorId', vendorMatch.vendor.qbId, { shouldValidate: true });
      form.setValue('saveVendorMapping', true);
    }
  }, [currentMapping, form, open, vendorMatch]);

  // The server stamps the transaction date when posting; shown read-only for context.
  const paymentDate = useMemo(() => format(new Date(), 'MMM d, yyyy'), []);

  // The backend only posts a payment for a planned payment that has been marked ready.
  const isReady = isReadyOverride ?? bill.plannedPayment?.isReady ?? false;
  const canSubmit = isReady && amount > 0 && !markPayment.isPending;

  const handleSubmit = (values: MarkPaymentFormData) => {
    markPayment.mutate(
      {
        purchaseOrderId: bill.purchaseOrder.id,
        month,
        year,
        ...values,
        saveVendorMapping: currentMapping ? false : values.saveVendorMapping,
      },
      { onSuccess: onPaymentMarked }
    );
  };

  const handleCreatedVendor = (
    vendor: QuickBooksPayee,
    mapping: QuickBooksVendorMapping | null
  ) => {
    setCreatedVendorOption(quickBooksPayeeToOption(vendor));
    form.setValue('qbVendorId', vendor.qbId, { shouldValidate: true });
    if (mapping) {
      setMappingOverride(mapping);
      form.setValue('saveVendorMapping', false);
    } else {
      form.setValue('saveVendorMapping', true);
    }
  };

  const handleUnmapVendor = () => {
    unmapVendor.mutate(bill.purchaseOrder.vendor.id, {
      onSuccess: () => {
        setMappingOverride(null);
        form.setValue('saveVendorMapping', true);
      },
    });
  };

  return (
    <>
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
                  options={vendorOptions.options}
                  vendorMatch={vendorMatch}
                  vendorName={vendorName}
                  mapping={currentMapping}
                  search={vendorSearchInput}
                  onSearchChange={setVendorSearchInput}
                  isLoading={vendorOptions.isLoading}
                  isFetchingNextPage={vendorOptions.isFetchingNextPage}
                  hasNextPage={vendorOptions.hasNextPage}
                  onFetchNextPage={vendorOptions.fetchNextPage}
                  onCreateVendor={() => setCreateVendorOpen(true)}
                  onUnmapVendor={handleUnmapVendor}
                  isUnmapping={unmapVendor.isPending}
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

      <CreateQuickBooksVendorDialog
        open={createVendorOpen}
        onOpenChange={setCreateVendorOpen}
        vendor={bill.purchaseOrder.vendor}
        onCreated={handleCreatedVendor}
      />
    </>
  );
}
