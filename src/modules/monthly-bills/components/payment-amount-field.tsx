import type { Ref } from 'react';

import { formInvalidControlClassName } from '@/app/components/form-field-label';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/app/components/ui/form';
import { InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import { DollarSign } from 'lucide-react';
import type { Control, FieldValues, Path } from 'react-hook-form';

interface PaymentAmountFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
}

/** What was paid, in dollars and cents. The form's schema holds it to the balance. */
export function PaymentAmountField<T extends FieldValues>({
  control,
  name,
}: PaymentAmountFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Amount</FormLabel>
          <InputWrapper className={fieldState.invalid ? formInvalidControlClassName : undefined}>
            <DollarSign className="size-4" />
            <AmountInput
              value={field.value as number | undefined}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
            />
          </InputWrapper>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * The number input, wired to its label and message by hand: `FormControl`'s
 * Slot replaces the input's `data-slot`, and `InputWrapper` styles the input by
 * that slot, so wrapping it drew a second border inside the wrapper.
 */
function AmountInput({
  value,
  onValueChange,
  onBlur,
  name,
  inputRef,
}: {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  onBlur: () => void;
  name: string;
  inputRef: Ref<HTMLInputElement>;
}) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <NumberInput
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      allowEmpty
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      name={name}
      ref={inputRef}
      min={0}
      decimalPlaces={2}
      useGrouping
      placeholder="0.00"
      data-testid="po-payment-amount-input"
    />
  );
}
