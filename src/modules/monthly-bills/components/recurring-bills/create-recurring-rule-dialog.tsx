import { useEffect, useState } from 'react';

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
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { BUSINESS_TIME_ZONE, todayDateOnly } from '@/app/lib/dates';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksVendorOptions,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import {
  AmountField,
  AmountModeField,
  ReferenceField,
  ScheduleFields,
  StartDateField,
  TextField,
  VendorField,
} from '@/modules/monthly-bills/components/recurring-bills/recurring-rule-form-fields';
import type {
  CreateRecurringBillRulePayload,
  RecurringBillGroup,
  RecurringBillItem,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import {
  recurringRuleFormDefaultValues,
  recurringRuleFormSchema,
  type RecurringRuleFormData,
} from '@/modules/monthly-bills/schemas/recurring-rule-form.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

type EditableRecurringRule = RecurringBillItem | RecurringBillGroup;

export function CreateRecurringRuleDialog({
  open,
  rule,
  isSaving = false,
  selectedDate,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  rule?: EditableRecurringRule | null;
  isSaving?: boolean;
  selectedDate?: Date;
  onOpenChange: (open: boolean) => void;
  onCreate: (rule: CreateRecurringBillRulePayload) => Promise<void> | void;
  onUpdate?: (ruleId: string, rule: CreateRecurringBillRulePayload) => Promise<void> | void;
}) {
  const isEdit = Boolean(rule);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorOption, setSelectedVendorOption] =
    useState<InfiniteSearchSelectOption | null>(null);

  const form = useForm<RecurringRuleFormData>({
    resolver: zodResolver(recurringRuleFormSchema),
    defaultValues: buildFormValues(null, selectedDate),
  });

  // As in mark-payment-dialog: the component's own state resets during render,
  // and only `form.reset` — which updates React Hook Form, an external store —
  // stays in an effect.
  // Scoped to the fields the reset actually reads, not to the `rule` object's
  // identity — a refetch hands back an equal-but-new object, and keying on that
  // would clear the vendor the user had just picked.
  useResetOnChange(
    JSON.stringify([
      open,
      rule?.ruleId ?? null,
      rule?.vendorId ?? null,
      rule?.vendorName ?? null,
      selectedDate ?? null,
    ]),
    () => {
      if (!open) return;
      setSelectedVendorOption(
        rule
          ? {
              value: rule.vendorId,
              label: rule.vendorName,
            }
          : null
      );
      setVendorSearch('');
    }
  );

  useEffect(() => {
    if (!open) return;
    form.reset(buildFormValues(rule ?? null, selectedDate));
  }, [form, open, rule, selectedDate]);

  const vendorPicker = useQuickBooksVendorOptions({
    search: vendorSearch,
    selectedOption: selectedVendorOption ?? undefined,
    enabled: open,
  });
  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);

  const resetForm = () => {
    form.reset(buildFormValues(null, selectedDate));
    setSelectedVendorOption(null);
    setVendorSearch('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (values: RecurringRuleFormData) => {
    const payload = toPayload(values);

    if (isEdit && rule && onUpdate) {
      await onUpdate(rule.ruleId, payload);
    } else {
      await onCreate(payload);
    }
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the bill details and future recurring cycles.'
              : 'Choose the bill, then tell ElliHub when it should come back.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
            <DialogBody className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="name" label="Bill name" />
                <VendorField
                  control={form.control}
                  options={vendorPicker.options}
                  selectedOption={selectedVendorOption}
                  search={vendorSearch}
                  isLoading={vendorPicker.isLoading}
                  isFetchingNextPage={vendorPicker.isFetchingNextPage}
                  hasNextPage={vendorPicker.hasNextPage}
                  onSearchChange={setVendorSearch}
                  onFetchNextPage={vendorPicker.fetchNextPage}
                  onOptionChange={setSelectedVendorOption}
                />
                <StartDateField control={form.control} />
                <ScheduleFields control={form.control} />
                <AmountModeField control={form.control} />
                <AmountField control={form.control} />
                <ReferenceField
                  control={form.control}
                  name="categoryId"
                  label="QuickBooks category"
                  valueName="categoryName"
                  options={categoriesQuery.data ?? []}
                  isLoading={categoriesQuery.isLoading}
                />
                <ReferenceField
                  control={form.control}
                  name="bankAccountId"
                  label="Bank account"
                  valueName="bankAccountName"
                  options={bankAccountsQuery.data ?? []}
                  isLoading={bankAccountsQuery.isLoading}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isEdit ? 'Save recurring bill' : 'Add recurring bill'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function toPayload(values: RecurringRuleFormData): CreateRecurringBillRulePayload {
  const dueDay = getRecurringRuleDueDay(values);

  return {
    name: values.name.trim(),
    vendorId: values.vendorId,
    vendorName: values.vendorName.trim(),
    categoryId: values.categoryId || undefined,
    categoryName: values.categoryName || undefined,
    bankAccountId: values.bankAccountId || undefined,
    bankAccountName: values.bankAccountName || undefined,
    frequency: values.frequency,
    scheduleTiming: values.scheduleTiming,
    weeklyDay: values.frequency === 'weekly' ? values.weeklyDay : undefined,
    customIntervalMonths: values.frequency === 'custom' ? values.customIntervalMonths : undefined,
    amountMode: values.amountMode,
    defaultAmount: values.amount,
    dueDay,
    startsOn: values.startsOn,
    anchorDate: values.startsOn,
  };
}

function buildFormValues(
  rule: EditableRecurringRule | null,
  selectedDate?: Date
): RecurringRuleFormData {
  const defaults = {
    ...recurringRuleFormDefaultValues,
    startsOn: getDefaultStartDate(selectedDate),
  };
  if (!rule || !isSupportedFormFrequency(rule.frequency)) return defaults;

  return {
    name: rule.name,
    vendorId: rule.vendorId,
    vendorName: rule.vendorName,
    frequency: rule.frequency,
    scheduleTiming: rule.scheduleTiming,
    weeklyDay: rule.weeklyDay ?? 1,
    customIntervalMonths: rule.customIntervalMonths ?? 6,
    amountMode: rule.amountMode,
    amount: rule.defaultAmount,
    dueDay: rule.dueDay,
    startsOn: rule.startsOn ?? defaults.startsOn,
    categoryId: rule.categoryId ?? '',
    categoryName: rule.categoryName ?? '',
    bankAccountId: rule.bankAccountId ?? '',
    bankAccountName: rule.bankAccountName ?? '',
  };
}

/**
 * The first of the month: the monthly-bill period the page is on (held as a
 * UTC date), otherwise this month on the business calendar — `new Date()`'s
 * UTC month turned over on the last evening of the month in New York.
 */
function getDefaultStartDate(selectedDate?: Date) {
  const month = selectedDate
    ? `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}`
    : todayDateOnly(BUSINESS_TIME_ZONE).slice(0, 7);
  return `${month}-01`;
}

function isSupportedFormFrequency(
  frequency: EditableRecurringRule['frequency']
): frequency is RecurringRuleFormData['frequency'] {
  return frequency === 'weekly' || frequency === 'monthly' || frequency === 'custom';
}

function getRecurringRuleDueDay(values: RecurringRuleFormData) {
  if (values.frequency === 'weekly') return values.weeklyDay;
  if (values.scheduleTiming === 'start') return 1;
  if (values.scheduleTiming === 'end') return 28;
  return values.dueDay;
}
