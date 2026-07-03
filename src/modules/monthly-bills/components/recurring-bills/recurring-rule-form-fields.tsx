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
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { cn } from '@/app/lib/utils';
import type { RecurringRuleFormData } from '@/modules/monthly-bills/schemas/recurring-rule-form.schema';
import type { RecurringBillAmountMode } from '@/modules/monthly-bills/types/recurring-bills.types';
import type { Control, UseFormReturn } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

const scheduleOptions = [
  {
    value: 'monthly',
    title: 'Monthly',
    description: 'Best for rent, subscriptions, and regular bills.',
  },
  {
    value: 'weekly',
    title: 'Weekly',
    description: 'Pick the weekday this should show up.',
  },
  {
    value: 'custom',
    title: 'Custom',
    description: 'Repeat every few months, such as 4 or 6.',
  },
] as const;

const weekdayOptions = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
] as const;

const monthTimingOptions = [
  { value: 'start', label: 'Start of the month' },
  { value: 'date', label: 'A specific date' },
  { value: 'end', label: 'End of the month' },
] as const;

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

export function ScheduleFields({ control }: { control: Control<RecurringRuleFormData> }) {
  const form = useFormContext<RecurringRuleFormData>();
  const frequency = form.watch('frequency');
  const scheduleTiming = form.watch('scheduleTiming');

  return (
    <div className="space-y-4 sm:col-span-2">
      <FormField
        control={control}
        name="frequency"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>When should this bill repeat?</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);

                  if (value === 'weekly') {
                    const weeklyDay = form.getValues('weeklyDay');
                    form.setValue('dueDay', weeklyDay, { shouldValidate: true });
                    return;
                  }

                  if (value === 'monthly') {
                    form.setValue('scheduleTiming', 'start', { shouldValidate: true });
                    form.setValue('dueDay', 1, { shouldValidate: true });
                    return;
                  }

                  form.setValue('scheduleTiming', 'date', { shouldValidate: true });
                }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {scheduleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex min-h-28 cursor-pointer gap-3 rounded-md border bg-background p-3 text-left transition-colors',
                      field.value === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5 shrink-0" />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {option.title}
                      </span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {frequency === 'weekly' ? <WeeklyDayField control={control} /> : null}

      {frequency === 'monthly' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MonthTimingField control={control} />
          {scheduleTiming === 'date' ? <DueDayField control={control} /> : null}
        </div>
      ) : null}

      {frequency === 'custom' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CustomIntervalField control={control} />
          <MonthTimingField control={control} />
          {scheduleTiming === 'date' ? <DueDayField control={control} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function WeeklyDayField({ control }: { control: Control<RecurringRuleFormData> }) {
  const form = useFormContext<RecurringRuleFormData>();

  return (
    <FormField
      control={control}
      name="weeklyDay"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Day of the week</FormLabel>
          <Select
            value={String(field.value)}
            onValueChange={(value) => {
              const day = Number(value);
              field.onChange(day);
              form.setValue('dueDay', day, { shouldValidate: true });
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {weekdayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>We will place this bill on that weekday every week.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MonthTimingField({ control }: { control: Control<RecurringRuleFormData> }) {
  const form = useFormContext<RecurringRuleFormData>();

  return (
    <FormField
      control={control}
      name="scheduleTiming"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Timing</FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              if (value === 'start') form.setValue('dueDay', 1, { shouldValidate: true });
              if (value === 'end') form.setValue('dueDay', 28, { shouldValidate: true });
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {monthTimingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            Choose start, end, or a fixed day for each month it repeats.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DueDayField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="dueDay"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Date</FormLabel>
          <FormControl>
            <NumberInput value={field.value} onValueChange={field.onChange} min={1} max={28} />
          </FormControl>
          <FormDescription>Use days 1-28 so the bill fits every month.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CustomIntervalField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="customIntervalMonths"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Every</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>
              <NumberInput value={field.value} onValueChange={field.onChange} min={2} max={24} />
            </FormControl>
            <span className="shrink-0 text-sm text-muted-foreground">months</span>
          </div>
          <FormDescription>Use 4 for quarterly-style bills, or 6 for twice a year.</FormDescription>
          <FormMessage />
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
