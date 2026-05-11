import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
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
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Company Email
              </FieldLabel>
              <InputWrapper>
                <Mail className="size-4" />
                <Input {...field} type="email" placeholder="info@company.com" />
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
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Company Phone
              </FieldLabel>
              <InputWrapper>
                <Phone className="size-4" />
                <Input
                  {...field}
                  onChange={(event) =>
                    field.onChange(event.target.value.replace(/[^+\d\s\-().]/g, ''))
                  }
                  type="tel"
                  placeholder="(555) 000-0000"
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
        render={({ field }) => (
          <Field>
            <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
              Address
            </FieldLabel>
            <InputWrapper>
              <Building2 className="size-4" />
              <Input {...field} placeholder="200 Commerce St, Dallas TX 75201" />
            </InputWrapper>
          </Field>
        )}
      />
    </>
  );
}
