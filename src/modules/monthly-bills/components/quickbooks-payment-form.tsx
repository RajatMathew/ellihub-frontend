import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DialogBody, DialogFooter } from '@/app/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { formatCurrency } from '@/app/lib/helpers';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksSuggestedVendorMatchQuery,
  useQuickBooksVendorOptions,
  useUnmapQuickBooksVendorMutation,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type {
  QuickBooksPayee,
  QuickBooksVendorMapping,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { CreateQuickBooksVendorDialog } from '@/modules/monthly-bills/components/create-quickbooks-vendor-dialog';
import { MarkPaymentDateField } from '@/modules/monthly-bills/components/mark-payment-date-field';
import { MarkPaymentReferenceSelect } from '@/modules/monthly-bills/components/mark-payment-reference-select';
import { MarkPaymentVendorField } from '@/modules/monthly-bills/components/mark-payment-vendor-field';
import { useMarkPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { findVendorMatch } from '@/modules/monthly-bills/lib/monthly-bills-vendor-match';
import {
  markPaymentFormSchema,
  type MarkPaymentFormData,
  type MarkPaymentResult,
  type MonthlyBillItem,
  type MonthlyBillsPeriodMeta,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface QuickBooksPaymentFormProps {
  /** Whether the dialog is open; the QuickBooks lists load only while it is. */
  open: boolean;
  bill: MonthlyBillItem;
  amount: number;
  canSubmit: boolean;
  period: MonthlyBillsPeriodMeta;
  onCancel: () => void;
  onPaymentMarked: (payment: MarkPaymentResult) => void;
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

function buildDefaultLineDescription(bill: MonthlyBillItem) {
  return `PO#${bill.purchaseOrder.poNumber} - Partial Payment ${bill.payments.length + 1}`;
}

/** Creates the payment in QuickBooks, then marks the bill paid in ElliHub. */
export function QuickBooksPaymentForm({
  open,
  bill,
  amount,
  canSubmit,
  period,
  onCancel,
  onPaymentMarked,
}: QuickBooksPaymentFormProps) {
  const vendorName = bill.purchaseOrder.vendor.name;
  const [vendorSearchInput, setVendorSearchInput] = useState('');
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
  const suggestedVendorMatchQuery = useQuickBooksSuggestedVendorMatchQuery(
    vendorName,
    open && !currentMapping
  );
  const suggestedVendorOption = useMemo(() => {
    if (currentMapping || !suggestedVendorMatchQuery.data) return undefined;
    return quickBooksPayeeToOption(suggestedVendorMatchQuery.data.vendor);
  }, [currentMapping, suggestedVendorMatchQuery.data]);
  const selectedVendorOption =
    selectedMappingOption ?? createdVendorOption ?? suggestedVendorOption;
  const defaultLineDescription = useMemo(() => buildDefaultLineDescription(bill), [bill]);

  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const vendorOptions = useQuickBooksVendorOptions({
    search: vendorSearchInput,
    selectedOption: selectedVendorOption,
    enabled: open,
  });
  const loadedVendorMatch = useMemo(
    () => (currentMapping ? null : findVendorMatch(vendorOptions.vendors, vendorName)),
    [currentMapping, vendorOptions.vendors, vendorName]
  );
  const vendorMatch = suggestedVendorMatchQuery.data ?? loadedVendorMatch;

  const markPayment = useMarkPaymentMutation({ onSuccess: onPaymentMarked });
  const unmapVendor = useUnmapQuickBooksVendorMutation();

  const form = useForm<MarkPaymentFormData>({
    resolver: zodResolver(markPaymentFormSchema),
    defaultValues: {
      qbVendorId: sourceMapping?.qbVendorId ?? '',
      bankAccountId: '',
      categoryId: '',
      txnDate: period.defaultTxnDate,
      description: defaultLineDescription,
      memo: '',
      saveVendorMapping: false,
      printLater: false,
    },
  });

  // The form's own state is reset during render; `form.reset` stays in the
  // effect below. React Hook Form is an external store, and updating one of
  // those is what an effect is for — it is only the `setState` calls that
  // cascade a second render, and only those that moved.
  useResetOnChange(
    JSON.stringify([
      open,
      bill.purchaseOrder.id,
      period.defaultTxnDate,
      defaultLineDescription,
      sourceMapping?.qbVendorId ?? null,
    ]),
    () => {
      if (!open) return;
      setCreatedVendorOption(undefined);
      setMappingOverride(undefined);
      setVendorSearchInput('');
    }
  );

  useEffect(() => {
    if (!open) return;

    form.reset({
      qbVendorId: sourceMapping?.qbVendorId ?? '',
      bankAccountId: '',
      categoryId: '',
      txnDate: period.defaultTxnDate,
      description: defaultLineDescription,
      memo: '',
      saveVendorMapping: false,
      printLater: false,
    });
  }, [
    bill.purchaseOrder.id,
    period.defaultTxnDate,
    defaultLineDescription,
    form,
    open,
    sourceMapping?.qbVendorId,
  ]);

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

  const handleSubmit = (values: MarkPaymentFormData) => {
    markPayment.mutate({
      purchaseOrderId: bill.purchaseOrder.id,
      month: period.month,
      year: period.year,
      ...values,
      saveVendorMapping: currentMapping ? false : values.saveVendorMapping,
    });
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
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
          <DialogBody className="space-y-5 pt-5">
            <MarkPaymentVendorField
              control={form.control}
              options={vendorOptions.options}
              selectedOption={selectedVendorOption}
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

              <MarkPaymentDateField
                control={form.control}
                name="txnDate"
                min={period.minTxnDate}
                max={period.maxTxnDate}
              />
            </div>

            <div className="space-y-4 rounded-md border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">QuickBooks Line Item</p>
                  <p className="text-xs text-muted-foreground">
                    This appears under Category details in QuickBooks.
                  </p>
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(amount)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MarkPaymentReferenceSelect
                  control={form.control}
                  name="categoryId"
                  label="Category"
                  options={categoriesQuery.data ?? []}
                  isLoading={categoriesQuery.isLoading}
                  placeholder="Select category"
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={defaultLineDescription} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Memo</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Add an optional memo for QuickBooks"
                      className="min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="printLater"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <div className="flex min-w-0 flex-col gap-1 text-left">
                    <FormLabel className="cursor-pointer select-none text-sm font-medium">
                      Print later in QuickBooks
                    </FormLabel>
                    <FormDescription className="text-xs leading-5">
                      Marks the QuickBooks check as needing to be printed.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit || markPayment.isPending}>
              <CreditCard className="size-4" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <CreateQuickBooksVendorDialog
        open={createVendorOpen}
        onOpenChange={setCreateVendorOpen}
        vendor={bill.purchaseOrder.vendor}
        onCreated={handleCreatedVendor}
      />
    </>
  );
}
