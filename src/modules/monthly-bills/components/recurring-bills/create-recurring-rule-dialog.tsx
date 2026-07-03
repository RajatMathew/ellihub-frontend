import { useState } from 'react';

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
  TextField,
  VendorField,
} from '@/modules/monthly-bills/components/recurring-bills/recurring-rule-form-fields';
import {
  recurringRuleFormDefaultValues,
  recurringRuleFormSchema,
  type RecurringRuleFormData,
} from '@/modules/monthly-bills/schemas/recurring-rule-form.schema';
import type { RecurringBillRule } from '@/modules/monthly-bills/types/recurring-bills.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export function CreateRecurringRuleDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (rule: RecurringBillRule) => void;
}) {
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorOption, setSelectedVendorOption] =
    useState<InfiniteSearchSelectOption | null>(null);

  const form = useForm<RecurringRuleFormData>({
    resolver: zodResolver(recurringRuleFormSchema),
    defaultValues: recurringRuleFormDefaultValues,
  });

  const vendorPicker = useQuickBooksVendorOptions({
    search: vendorSearch,
    selectedOption: selectedVendorOption ?? undefined,
    enabled: open,
  });
  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);

  const resetForm = () => {
    form.reset(recurringRuleFormDefaultValues);
    setSelectedVendorOption(null);
    setVendorSearch('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = (values: RecurringRuleFormData) => {
    const dueDay = getRecurringRuleDueDay(values);

    onCreate({
      id: `rule-${Date.now()}`,
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
      customIntervalMonths:
        values.frequency === 'custom' ? values.customIntervalMonths : undefined,
      amountMode: values.amountMode,
      defaultAmount: values.amount,
      dueDay,
      isActive: true,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Recurring Bill</DialogTitle>
          <DialogDescription>
            Add the basics, then choose the repeat schedule that matches how the bill arrives.
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
              <Button type="submit" variant="primary">
                Add recurring bill
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getRecurringRuleDueDay(values: RecurringRuleFormData) {
  if (values.frequency === 'weekly') return values.weeklyDay;
  if (values.scheduleTiming === 'start') return 1;
  if (values.scheduleTiming === 'end') return 28;
  return values.dueDay;
}
