import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { formatDateOnly } from '@/app/lib/dates';
import type { Control, FieldValues, Path } from 'react-hook-form';

interface MarkPaymentDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  /** The first and last day a payment in this monthly bill period may be dated. */
  min: string;
  max: string;
  /** Replaces the default "Must be between..." line. */
  description?: string;
}

/** The payment date, held to the monthly bill period - the server refuses any other. */
export function MarkPaymentDateField<T extends FieldValues>({
  control,
  name,
  min,
  max,
  description,
}: MarkPaymentDateFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Payment Date</FormLabel>
          <FormControl>
            <Input {...field} type="date" min={min} max={max} />
          </FormControl>
          <FormDescription>
            {description ?? (
              <>
                Must be between {formatDateOnly(min, { month: 'short', day: 'numeric' })} and{' '}
                {formatDateOnly(max)}.
              </>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
