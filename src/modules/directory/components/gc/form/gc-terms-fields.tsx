import { Field, FieldError } from '@/app/components/ui/field';
import { InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import type { GCFormValues } from '@/modules/directory/schemas/gc.schema';
import { Controller, type Control } from 'react-hook-form';

import { GCFormFieldLabel, gcInvalidControlClassName } from './gc-form-field';

interface GCTermsFieldsProps {
  control: Control<GCFormValues>;
}

export function GCTermsFields({ control }: GCTermsFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Controller
        name="paymentTerms"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <GCFormFieldLabel required>Payment Terms</GCFormFieldLabel>
            <Select
              key={field.value || 'empty-payment-terms'}
              value={field.value || ''}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                aria-invalid={fieldState.invalid}
                className={fieldState.invalid ? gcInvalidControlClassName : undefined}
                data-testid="gc-payment-terms-select"
              >
                <SelectValue placeholder="Select terms..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="retainagePercent"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <GCFormFieldLabel required>Retainage %</GCFormFieldLabel>
            <InputWrapper className={fieldState.invalid ? gcInvalidControlClassName : undefined}>
              <NumberInput
                value={field.value}
                onValueChange={field.onChange}
                min={0}
                max={100}
                decimalPlaces={2}
                placeholder="0"
                aria-invalid={fieldState.invalid}
                data-testid="gc-retainage-percent-input"
              />
            </InputWrapper>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}
