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
    value: 'weekly',
    title: 'Weekly',
    description: 'Use this for bills that are paid on the same weekday.',
  },
  {
    value: 'monthly',
    title: 'Monthly',
    description: 'Use this for bills due once every month.',
  },
  {
    value: 'custom',
    title: 'Custom',
    description: 'Use this for bills due every few months.',
  },
] as const;

const weekdayOptions = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '7', label: 'Sun' },
] as const;

const monthTimingOptions = [
  {
    value: 'start',
    title: 'Start',
    description: 'Due at the beginning of the month.',
  },
  {
    value: 'date',
    title: 'Exact date',
    description: 'Due on the same date each month.',
  },
  {
    value: 'end',
    title: 'End',
    description: 'Due on the last day of the month.',
  },
] as const;

const scheduleDetailGridClass = 'grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-3';

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

export function StartDateField({ control }: { control: Control<RecurringRuleFormData> }) {
  return (
    <FormField
      control={control}
      name="startsOn"
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Start date</FormLabel>
          <FormControl>
            <Input {...field} type="date" />
          </FormControl>
          <FormDescription>The first date this rule can appear in recurring bills.</FormDescription>
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
          <FormLabel>Default amount</FormLabel>
          <FormControl>
            <NumberInput
              value={field.value}
              onValueChange={field.onChange}
              decimalPlaces={2}
              min={0}
            />
          </FormControl>
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
            <FormLabel>How often should this bill repeat?</FormLabel>
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
                      'flex min-h-24 cursor-pointer rounded-md border bg-background p-3 text-left transition-colors',
                      field.value === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
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

      {frequency === 'weekly' ? (
        <WeeklyDayField control={control} />
      ) : null}

      {frequency === 'monthly' ? (
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-4">
          <MonthTimingField control={control} className="sm:col-span-3" />
          {scheduleTiming === 'date' ? <DueDayField control={control} /> : null}
        </div>
      ) : null}

      {frequency === 'custom' ? (
        <div className="space-y-4">
          <div className={scheduleDetailGridClass}>
            <CustomIntervalField control={control} />
          </div>
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-4">
            <MonthTimingField control={control} className="sm:col-span-3" />
            {scheduleTiming === 'date' ? <DueDayField control={control} /> : null}
          </div>
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
        <FormItem className="space-y-2">
          <FormLabel>Which day of the week?</FormLabel>
          <FormControl>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
              {weekdayOptions.map((option) => {
                const selected = String(field.value) === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'h-10 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted/50'
                    )}
                    onClick={() => {
                      const day = Number(option.value);
                      field.onChange(day);
                      form.setValue('dueDay', day, { shouldValidate: true });
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </FormControl>
          <FormDescription>The bill will appear each selected weekday.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MonthTimingField({
  control,
  className,
}: {
  control: Control<RecurringRuleFormData>;
  className?: string;
}) {
  const form = useFormContext<RecurringRuleFormData>();

  return (
    <FormField
      control={control}
      name="scheduleTiming"
      render={({ field }) => (
        <FormItem className={cn('space-y-2', className)}>
          <FormLabel>When in the month?</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                if (value === 'start') form.setValue('dueDay', 1, { shouldValidate: true });
                if (value === 'end') form.setValue('dueDay', 28, { shouldValidate: true });
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {monthTimingOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex min-h-24 cursor-pointer rounded-md border bg-background p-3 text-left transition-colors',
                    field.value === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
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
          <FormDescription>Use 1-28 so every month is covered.</FormDescription>
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
          <div className="max-w-40">
            <FormControl>
              <NumberInput value={field.value} onValueChange={field.onChange} min={2} max={24} />
            </FormControl>
          </div>
          <FormDescription>Months</FormDescription>
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
