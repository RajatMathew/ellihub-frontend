import { useEffect, useState } from 'react';

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
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
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
import { formatCurrency } from '@/app/lib/helpers';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type { RecurringBillRule } from '@/modules/monthly-bills/types/recurring-bills.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Paperclip } from 'lucide-react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

const recurringPayFormSchema = z.object({
  amount: z.coerce.number().positive('Amount is required.'),
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
  selectedDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (payment: {
    ruleId: string;
    amount: number;
    label: string;
    bankAccountId: string;
    bankAccountName?: string;
    categoryId: string;
    categoryName?: string;
    invoiceFile?: File;
  }) => void;
}

interface InvoiceDraft {
  ruleId: string;
  file: File | null;
}

interface ReferenceOption {
  id: string;
  qbId: string;
  name: string;
  fullyQualifiedName: string | null;
}

export function RecurringPayDialog({
  rule,
  selectedDate,
  open,
  onOpenChange,
  onPaid,
}: RecurringPayDialogProps) {
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(null);
  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const form = useForm<RecurringPayFormData>({
    resolver: zodResolver(recurringPayFormSchema),
    defaultValues: buildDefaultValues(rule, selectedDate),
  });
  const selectedInvoiceFile =
    rule && invoiceDraft?.ruleId === rule.id ? invoiceDraft.file : null;

  useEffect(() => {
    if (!open) return;
    form.reset(buildDefaultValues(rule, selectedDate));
  }, [form, open, rule, selectedDate]);

  const handleSubmit = (values: RecurringPayFormData) => {
    if (!rule) return;

    onPaid({
      ruleId: rule.id,
      amount: values.amount,
      label: formatPaymentLabel(values.txnDate),
      bankAccountId: values.bankAccountId,
      bankAccountName: values.bankAccountName,
      categoryId: values.categoryId,
      categoryName: values.categoryName,
      invoiceFile: selectedInvoiceFile ?? undefined,
    });
    setInvoiceDraft(null);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setInvoiceDraft(null);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? getDialogTitle(rule) : 'Pay Recurring Bill'}</DialogTitle>
          <DialogDescription>
            {rule && isVariableAmountRule(rule)
              ? 'Update the amount if this bill changed, then save the payment.'
              : 'Confirm the payment details before saving.'}
          </DialogDescription>
        </DialogHeader>

        {rule && (
          <Form {...form}>
            <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
              <DialogBody className="space-y-5">
                <RecurringPaymentSummary rule={rule} />

                {isVariableAmountRule(rule) && (
                  <div className="space-y-4 rounded-md border bg-muted/20 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Variable amount</p>
                    </div>

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
                              className="text-right text-base font-semibold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

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

                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Paperclip className="size-4 text-muted-foreground" />
                      Invoice or bill
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Optional for now. This is kept locally and is not uploaded to backend.
                    </p>
                  </div>
                  <FileDropZone
                    value={selectedInvoiceFile}
                    onChange={(file) => setInvoiceDraft(rule ? { ruleId: rule.id, file } : null)}
                    showSelectedPreview
                  />
                </div>
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  <CreditCard className="size-4" />
                  Save
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
  const amountValue = formatCurrency(rule.lastPaidAmount ?? rule.defaultAmount);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-3">
      <SummaryItem label="Amount" value={amountValue} emphasize />
      <SummaryItem label="Vendor" value={rule.vendorName} />
      <SummaryItem label="Bill" value={rule.name} />
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

function buildDefaultValues(
  rule: RecurringBillRule | null,
  selectedDate: Date
): RecurringPayFormData {
  const txnDate = getDefaultPaymentDate(rule, selectedDate);

  return {
    amount: rule?.lastPaidAmount ?? rule?.defaultAmount ?? 0,
    bankAccountId: rule?.bankAccountId ?? '',
    bankAccountName: rule?.bankAccountName ?? '',
    categoryId: rule?.categoryId ?? '',
    categoryName: rule?.categoryName ?? '',
    txnDate,
    description: rule ? `${rule.name} - ${formatPaymentLabel(txnDate)}` : '',
    memo: '',
    printLater: false,
  };
}

function getDialogTitle(rule: RecurringBillRule) {
  return isVariableAmountRule(rule) ? 'Pay Variable Bill' : 'Pay Recurring Bill';
}

function isVariableAmountRule(rule: RecurringBillRule) {
  return rule.amountMode === 'variable' || rule.amountMode === 'requires-entry';
}

function getDefaultPaymentDate(rule: RecurringBillRule | null, selectedDate: Date) {
  const dueDay = getScheduledDayOfMonth(rule, selectedDate);
  const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dueDay);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getScheduledDayOfMonth(rule: RecurringBillRule | null, selectedDate: Date) {
  if (!rule) return 1;

  if (rule.frequency === 'weekly' || rule.frequency === 'biweekly') {
    return getFirstWeekdayInMonth(selectedDate, rule.weeklyDay ?? rule.dueDay);
  }

  if (rule.scheduleTiming === 'end') {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  }

  if (rule.scheduleTiming === 'start') return 1;

  return Math.max(1, Math.min(rule.dueDay, 28));
}

function getFirstWeekdayInMonth(selectedDate: Date, dueDay: number) {
  const targetDay = Math.max(1, Math.min(dueDay, 7)) % 7;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month, day).getDay() === targetDay) return day;
  }

  return 1;
}

function formatPaymentLabel(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
