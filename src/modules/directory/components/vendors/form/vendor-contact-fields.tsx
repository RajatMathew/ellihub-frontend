import { FormFieldLabel, formInvalidControlClassName } from '@/app/components/form-field-label';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { VendorFormValues } from '@/modules/directory/schemas/vendor.schema';
import { MapPin, Smartphone } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

interface VendorContactFieldProps {
  control: Control<VendorFormValues>;
}

export function VendorPhoneField({ control }: VendorContactFieldProps) {
  return (
    <Controller
      name="phone"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormFieldLabel>Cell Phone</FormFieldLabel>
          <InputWrapper className={fieldState.invalid ? formInvalidControlClassName : undefined}>
            <Smartphone className="size-4" />
            <Input
              {...field}
              onChange={(event) => field.onChange(event.target.value.replace(/[^+\d\s\-().]/g, ''))}
              type="tel"
              inputMode="tel"
              placeholder="(555) 000-0000"
              aria-invalid={fieldState.invalid}
              autoComplete="tel"
              data-testid="vendor-phone-input"
            />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function VendorAddressField({ control }: VendorContactFieldProps) {
  return (
    <Controller
      name="address"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormFieldLabel>Address</FormFieldLabel>
          <InputWrapper className={fieldState.invalid ? formInvalidControlClassName : undefined}>
            <MapPin className="size-4" />
            <Input
              {...field}
              placeholder="200 Commerce St, Dallas TX 75201"
              aria-invalid={fieldState.invalid}
              autoComplete="street-address"
              data-testid="vendor-address-input"
            />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
