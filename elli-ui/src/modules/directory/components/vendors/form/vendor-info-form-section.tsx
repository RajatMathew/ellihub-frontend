import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import {
  VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS,
} from '@/modules/directory/constants/vendors.constants';
import type { VendorFormValues, VendorTypeObject } from '@/modules/directory/schemas/vendor.schema';
import { Globe, Mail } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

interface VendorInfoFormSectionProps {
  control: Control<VendorFormValues>;
  vendorTypes: VendorTypeObject[];
}

export function VendorInfoFormSection({ control, vendorTypes }: VendorInfoFormSectionProps) {
  const typeOptions =
    vendorTypes.length > 0
      ? vendorTypes.map((type) => ({
          value: type.id,
          label: type.label || type.name || type.type || 'Unknown',
        }))
      : VENDOR_TYPE_OPTIONS.map((option) => ({
          value: typeof option.value === 'string' ? option.value : option.value.id,
          label: option.label,
        }));

  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">Info</h2>
          <p className="text-sm text-muted-foreground">Corporate identity and system status.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Vendor Name
                </FieldLabel>
                <InputWrapper>
                  <Input
                    {...field}
                    placeholder="e.g. Acme Construction Services"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Email
                </FieldLabel>
                <InputWrapper>
                  <Mail className="size-4" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="vendor@example.com"
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Vendor Type
                </FieldLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select vendor type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
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
            name="status"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Default Status
                </FieldLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="taxId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Tax ID / EIN <span className="font-normal text-muted-foreground">(Optional)</span>
                </FieldLabel>
                <InputWrapper>
                  <Input
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.replace(/[^\d-]/g, ''))}
                    placeholder="12-3456789"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    maxLength={10}
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="website"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Website
                </FieldLabel>
                <InputWrapper>
                  <Globe className="size-4" />
                  <Input
                    {...field}
                    placeholder="https://..."
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="paymentTerms"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Payment Terms
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
        </div>
      </CardContent>
    </Card>
  );
}
