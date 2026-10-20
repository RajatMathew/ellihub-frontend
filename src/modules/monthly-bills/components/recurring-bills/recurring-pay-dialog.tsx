import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { formatDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type { PayRecurringBillPayload } from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import type { RecurringBillRule } from '@/modules/monthly-bills/types/recurring-bills.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

const recurringPayFormSchema = z.object({
  // Not `z.coerce.number()`. Coercion makes the schema's *input* type `unknown`
  // while its output is `number`, and `zodResolver` types the form from the
  // input — so `useForm<RecurringPayFormData>` stopped matching its own
  // resolver. Nothing is coerced here anyway: the wire string is already turned
  // into a number by `recurring-bills.schema.ts`, `buildDefaultValues` seeds a
  // number, and `NumberInput.onValueChange` emits one.
  amount: z.number().positive('Amount is required.'),
  bankAccountId: z.string().min(1, 'Bank account is required.'),
  bankAccountName: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required.'),
  categoryName: z.string().optional(),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  description: z.string().trim().min(1, 'Description is required.').max(4000),
  memo: z.string().trim().max(4000),
  printLater: z.boolean(),
});

type RecurringPayFormData = z.infer<typeof recurringPayFormSchema>;

interface RecurringPayDialogProps {
  rule: RecurringBillRule | null;
  open: boolean;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (ruleId: string, payload: PayRecurringBillPayload) => Promise<void> | void;
}

interface ReferenceOption {
  id: string;
  qbId: string;
  name: string;
  fullyQualifiedName: string | null;
}

export function RecurringPayDialog({
  rule,
  open,
  isSaving = false,
  onOpenChange,
  onPaid,
}: RecurringPayDialogProps) {
  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const form = useForm<RecurringPayFormData>({
    resolver: zodResolver(recurringPayFormSchema),
    defaultValues: buildDefaultValues(rule),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildDefaultValues(rule));
  }, [form, open, rule]);

  const handleSubmit = async (values: RecurringPayFormData) => {
    if (!rule) return;

    await onPaid(rule.ruleId, {
      cycleKey: rule.cycleKey,
      dueDate: rule.dueDate,
      amount: values.amount,
      txnDate: values.txnDate,
      qbVendorId: rule.vendorId,
      bankAccountId: values.bankAccountId,
      categoryId: values.categoryId,
      description: values.description,
      memo: values.memo || '',
      printLater: values.printLater,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? getDialogTitle(rule) : 'Pay Recurring Bill'}</DialogTitle>
          <DialogDescription>
            {rule && isVariableAmountRule(rule)
              ? "Enter this period's actual amount, then create the QuickBooks payment."
              : 'Confirm the details, then create the QuickBooks payment.'}
          </DialogDescription>
        </DialogHeader>

        {rule && (
          <Form {...form}>
            <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
              <DialogBody className="space-y-5">
                <RecurringPaymentSummary rule={rule} />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onValueChange={field.onChange}
                          decimalPlaces={2}
                          min={0}
                          disabled={!isVariableAmountRule(rule)}
                          className="text-right text-base font-semibold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReferenceSelect
                    form={form}
                    name="bankAccountId"
                    valueName="bankAccountName"
                    label="Bank Account"
                    options={bankAccountsQuery.data ?? []}
                    isLoading={bankAccountsQuery.isLoading}
                    placeholder="Select bank account"
                  />

                  <FormField
                    control={form.control}
                    name="txnDate"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 rounded-md border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">QuickBooks Line Item</p>
                    <p className="text-xs text-muted-foreground">
                      These accounting details are used when creating the payment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReferenceSelect
                      form={form}
                      name="categoryId"
                      valueName="categoryName"
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
                            <Input {...field} />
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  <CreditCard className="size-4" />
                  Create payment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecurringPaymentSummary({ rule }: { rule: RecurringBillRule }) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-3">
      <SummaryItem label="Amount" value={formatCurrency(rule.defaultAmount)} emphasize />
      <SummaryItem label="Vendor" value={rule.vendorName} />
      <SummaryItem label="Due" value={formatDateOnly(rule.dueDate)} />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={emphasize ? 'text-lg font-semibold text-foreground' : 'text-sm font-medium'}>
        {value}
      </p>
    </div>
  );
}

function ReferenceSelect({
  form,
  name,
  valueName,
  label,
  options,
  isLoading,
  placeholder,
}: {
  form: UseFormReturn<RecurringPayFormData>;
  name: 'bankAccountId' | 'categoryId';
  valueName: 'bankAccountName' | 'categoryName';
  label: string;
  options: ReferenceOption[];
  isLoading: boolean;
  placeholder: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              const selected = options.find((option) => option.qbId === value);
              form.setValue(valueName, selected?.fullyQualifiedName ?? selected?.name ?? '');
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.qbId}>
                  {option.fullyQualifiedName ?? option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function buildDefaultValues(rule: RecurringBillRule | null): RecurringPayFormData {
  return {
    amount: rule?.defaultAmount ?? 0,
    bankAccountId: rule?.bankAccountId ?? '',
    bankAccountName: rule?.bankAccountName ?? '',
    categoryId: rule?.categoryId ?? '',
    categoryName: rule?.categoryName ?? '',
    txnDate: rule?.dueDate ?? '',
    description: rule ? `${rule.name} - ${formatDateOnly(rule.dueDate)}` : '',
    memo: '',
    printLater: false,
  };
}

function getDialogTitle(rule: RecurringBillRule) {
  return isVariableAmountRule(rule) ? 'Pay Variable Bill' : 'Pay Recurring Bill';
}

function isVariableAmountRule(rule: RecurringBillRule) {
  return rule.amountMode === 'variable';
}
