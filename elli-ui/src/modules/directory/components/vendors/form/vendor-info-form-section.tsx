import { useMemo } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
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
import { Controller, useWatch, type Control } from 'react-hook-form';

import { VendorFormFieldLabel, vendorInvalidControlClassName } from './vendor-form-field';

interface VendorInfoFormSectionProps {
  control: Control<VendorFormValues>;
  vendorTypes: VendorTypeObject[];
}

export function VendorInfoFormSection({ control, vendorTypes }: VendorInfoFormSectionProps) {
  const selectedType = useWatch({ control, name: 'type' });
  const selectedStatus = useWatch({ control, name: 'status' });
  const selectedPaymentTerms = useWatch({ control, name: 'paymentTerms' });

  const typeOptions = useMemo(() => {
    const options =
      vendorTypes.length > 0
        ? vendorTypes.map((type) => ({
            value: type.id,
            label: type.label || type.name || type.type || 'Unknown',
          }))
        : VENDOR_TYPE_OPTIONS.map((option) => ({
            value: typeof option.value === 'string' ? option.value : option.value.id,
            label: option.label,
          }));

    return ensureSelectedOption(options, selectedType, formatOptionFallbackLabel);
  }, [selectedType, vendorTypes]);

  const statusOptions = useMemo(
    () => ensureSelectedOption(VENDOR_STATUS_OPTIONS, selectedStatus, formatOptionFallbackLabel),
    [selectedStatus]
  );

  const paymentTermsOptions = useMemo(
    () =>
      ensureSelectedOption(PAYMENT_TERMS_OPTIONS, selectedPaymentTerms, formatOptionFallbackLabel),
    [selectedPaymentTerms]
  );

  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Info</h2>
          <p className="text-sm text-muted-foreground">Corporate identity and system status.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <VendorFormFieldLabel required>Vendor Name</VendorFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                >
                  <Input
                    {...field}
                    placeholder="e.g. Acme Construction Services"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    data-testid="vendor-name-input"
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
                <VendorFormFieldLabel>Email</VendorFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                >
                  <Mail className="size-4" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="vendor@example.com"
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                    data-testid="vendor-email-input"
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
                <VendorFormFieldLabel required>Vendor Type</VendorFormFieldLabel>
                <Select
                  key={field.value || 'empty-type'}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                    data-testid="vendor-type-select"
                  >
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
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <VendorFormFieldLabel
                  required
                  info="Choose Inactive if the vendor is currently out of operation or unavailable for new work."
                  infoLabel="Default status information"
                >
                  Default Status
                </VendorFormFieldLabel>
                <Select
                  key={field.value || 'empty-status'}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                    data-testid="vendor-status-select"
                  >
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
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
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="taxId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <VendorFormFieldLabel>Tax ID / EIN</VendorFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                >
                  <Input
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.replace(/[^\d-]/g, ''))}
                    placeholder="12-3456789"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    maxLength={10}
                    data-testid="vendor-tax-id-input"
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
                <VendorFormFieldLabel>Website</VendorFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                >
                  <Globe className="size-4" />
                  <Input
                    {...field}
                    placeholder="https://..."
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    data-testid="vendor-website-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="paymentTerms"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <VendorFormFieldLabel required>Payment Terms</VendorFormFieldLabel>
                <Select
                  key={field.value || 'empty-payment-terms'}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? vendorInvalidControlClassName : undefined}
                    data-testid="vendor-payment-terms-select"
                  >
                    <SelectValue placeholder="Select terms..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTermsOptions.map((option) => (
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
        </div>
      </CardContent>
    </Card>
  );
}

function ensureSelectedOption<T extends { value: string; label: string }>(
  options: T[],
  selectedValue: string | undefined,
  getFallbackLabel: (value: string) => string
): T[] {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) return options;

  return [{ value: selectedValue, label: getFallbackLabel(selectedValue) } as T, ...options];
}

function formatOptionFallbackLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
