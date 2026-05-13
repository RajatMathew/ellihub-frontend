import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
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

interface GCTermsFieldsProps {
  control: Control<GCFormValues>;
}

export function GCTermsFields({ control }: GCTermsFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Controller
        name="paymentTerms"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
              Payment Terms
            </FieldLabel>
            <Select
              key={field.value || 'empty-payment-terms'}
              value={field.value || ''}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
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
          </Field>
        )}
      />
      <Controller
        name="retainagePercent"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
              Retainage %
            </FieldLabel>
            <InputWrapper>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                placeholder="10"
              />
            </InputWrapper>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}
