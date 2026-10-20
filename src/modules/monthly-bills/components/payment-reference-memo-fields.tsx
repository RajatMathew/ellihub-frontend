import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import type { Control } from 'react-hook-form';

interface PaymentReferenceMemoValues {
  reference: string;
  memo: string;
}

interface PaymentReferenceMemoFieldsProps<T extends PaymentReferenceMemoValues> {
  control: Control<T>;
}

/** The check or confirmation number and memo a payment made by hand carries. */
export function PaymentReferenceMemoFields<T extends PaymentReferenceMemoValues>({
  control,
}: PaymentReferenceMemoFieldsProps<T>) {
  // Both names exist on every form this is used in; the generic cannot prove it.
  const formControl = control as unknown as Control<PaymentReferenceMemoValues>;

  return (
    <>
      <FormField
        control={formControl}
        name="reference"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Reference</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Check no., wire or confirmation number" />
            </FormControl>
            <FormDescription>Optional. Shown with the payment.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={formControl}
        name="memo"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>Memo</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Add an optional memo" className="min-h-24" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
