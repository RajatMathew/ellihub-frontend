import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { RecurringRuleFormData } from '@/modules/monthly-bills/schemas/recurring-rule-form.schema';
import type {
  RecurringBillAmountMode,
  RecurringBillFrequency,
} from '@/modules/monthly-bills/types/recurring-bills.types';
import type { Control, UseFormReturn } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

export function TextField({
  control,
  name,
  label,
}: {
  control: Control<RecurringRuleFormData>;
  name: 'name';
  label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AmountField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="amount"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Expected amount</FormLabel>
          <FormControl>
            <NumberInput
              value={field.value}
              onValueChange={field.onChange}
              decimalPlaces={2}
              min={0}
            />
          </FormControl>
          <FormDescription>Use the usual amount. You can change it for each payment.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AmountModeField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="amountMode"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Amount type</FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => field.onChange(value as RecurringBillAmountMode)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="variable">Variable</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>
            Variable bills ask for this month's actual amount before payment.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DueDayField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="dueDay"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Due day</FormLabel>
          <FormControl>
            <NumberInput value={field.value} onValueChange={field.onChange} min={1} max={28} />
          </FormControl>
          <FormDescription>For weekly schedules, 1 means Monday. For monthly schedules, use day 1-28.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function FrequencyField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="frequency"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Repeats</FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => field.onChange(value as RecurringBillFrequency)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Every 2 weeks</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

export type InfiniteFieldProps = {
  control: Control<RecurringRuleFormData>;
  options: InfiniteSearchSelectOption[];
  selectedOption: InfiniteSearchSelectOption | null;
  search: string;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onFetchNextPage: () => void;
  onOptionChange: (option: InfiniteSearchSelectOption | null) => void;
};

export function VendorField(props: InfiniteFieldProps) {
  return (
    <LookupField
      {...props}
      name="vendorId"
      label="Vendor"
      placeholder="Select vendor"
      searchPlaceholder="Search QuickBooks vendors..."
      emptyMessage="No QuickBooks vendors found."
      onPicked={(option, form) => {
        form.setValue('vendorName', option?.label ?? '', { shouldValidate: true });
      }}
    />
  );
}

function LookupField({
  control,
  name,
  label,
  options,
  selectedOption,
  search,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  onSearchChange,
  onFetchNextPage,
  onOptionChange,
  onPicked,
}: InfiniteFieldProps & {
  name: 'vendorId';
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  onPicked: (
    option: InfiniteSearchSelectOption | null,
    form: UseFormReturn<RecurringRuleFormData>
  ) => void;
}) {
  const form = useFormContext<RecurringRuleFormData>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <InfiniteSearchSelect
              options={options}
              value={field.value || null}
              selectedOption={selectedOption}
              search={search}
              disabled={disabled}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              onSearchChange={onSearchChange}
              onFetchNextPage={onFetchNextPage}
              onValueChange={(value) => field.onChange(value ?? '')}
              onOptionChange={(option) => {
                onOptionChange(option);
                onPicked(option, form);
              }}
              placeholder={isLoading ? 'Loading...' : placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyMessage={emptyMessage}
              loadingMessage="Loading..."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ReferenceField({
  control,
  name,
  valueName,
  label,
  options,
  isLoading,
}: {
  control: Control<RecurringRuleFormData>;
  name: 'categoryId' | 'bankAccountId';
  valueName: 'categoryName' | 'bankAccountName';
  label: string;
  options: { id: string; qbId: string; name: string; fullyQualifiedName: string | null }[];
  isLoading: boolean;
}) {
  const form = useFormContext<RecurringRuleFormData>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ?? ''}
            onValueChange={(value) => {
              field.onChange(value);
              const selected = options.find((option) => option.qbId === value);
              form.setValue(valueName, selected?.fullyQualifiedName ?? selected?.name ?? '');
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? 'Loading...' : `Select ${label.toLowerCase()}`}
                />
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
