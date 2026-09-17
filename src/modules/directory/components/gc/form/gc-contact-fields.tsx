import { FormFieldLabel, formInvalidControlClassName } from '@/app/components/form-field-label';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { GCFormValues } from '@/modules/directory/schemas/gc.schema';
import { Building2, Mail, Phone } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

interface GCContactFieldsProps {
  control: Control<GCFormValues>;
}

export function GCContactFields({ control }: GCContactFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormFieldLabel>Company Email</FormFieldLabel>
              <InputWrapper
                className={fieldState.invalid ? formInvalidControlClassName : undefined}
              >
                <Mail className="size-4" />
                <Input
                  {...field}
                  type="email"
                  placeholder="info@company.com"
                  aria-invalid={fieldState.invalid}
                  data-testid="gc-email-input"
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormFieldLabel>Company Phone</FormFieldLabel>
              <InputWrapper
                className={fieldState.invalid ? formInvalidControlClassName : undefined}
              >
                <Phone className="size-4" />
                <Input
                  {...field}
                  onChange={(event) =>
                    field.onChange(event.target.value.replace(/[^+\d\s\-().]/g, ''))
                  }
                  type="tel"
                  placeholder="(555) 000-0000"
                  aria-invalid={fieldState.invalid}
                  data-testid="gc-phone-input"
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name="address"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormFieldLabel>Address</FormFieldLabel>
            <InputWrapper className={fieldState.invalid ? formInvalidControlClassName : undefined}>
              <Building2 className="size-4" />
              <Input
                {...field}
                placeholder="200 Commerce St, Dallas TX 75201"
                aria-invalid={fieldState.invalid}
                data-testid="gc-address-input"
              />
            </InputWrapper>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  );
}
