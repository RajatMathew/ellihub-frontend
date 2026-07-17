import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { GC_STATUS_OPTIONS } from '@/modules/directory/constants/gc.constants';
import type { GCFormValues } from '@/modules/directory/schemas/gc.schema';
import { Globe } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

import { GCContactFields } from './gc-contact-fields';
import { GCFormFieldLabel, gcInvalidControlClassName } from './gc-form-field';
import { GCTermsFields } from './gc-terms-fields';

interface GCInfoFormSectionProps {
  control: Control<GCFormValues>;
  gcTypeOptions: { value: string; label: string }[];
}

export function GCInfoFormSection({ control, gcTypeOptions }: GCInfoFormSectionProps) {
  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">General Information</h2>
          <p className="text-sm text-muted-foreground">Core entity details and classification.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <GCFormFieldLabel required>GC Name</GCFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? gcInvalidControlClassName : undefined}
                >
                  <Input
                    {...field}
                    placeholder="e.g. Navillus Inc."
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    data-testid="gc-name-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="gcTypeId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <GCFormFieldLabel required>GC Type</GCFormFieldLabel>
                <SearchableSelect
                  options={gcTypeOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value || '')}
                  placeholder="Select GC type..."
                  searchPlaceholder="Search types..."
                  emptyMessage="No types found."
                  disabled={gcTypeOptions.length === 0}
                  className={fieldState.invalid ? gcInvalidControlClassName : undefined}
                  testId="gc-type-select"
                />
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
                <GCFormFieldLabel>Official Website</GCFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? gcInvalidControlClassName : undefined}
                >
                  <Globe className="size-4" />
                  <Input
                    {...field}
                    placeholder="https://..."
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    data-testid="gc-website-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <GCFormFieldLabel
                  required
                  info="Choose Inactive if the general contractor is currently out of operation or unavailable for new work."
                  infoLabel="Initial status information"
                >
                  Initial Status
                </GCFormFieldLabel>
                <Select
                  key={field.value || 'empty-status'}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? gcInvalidControlClassName : undefined}
                    data-testid="gc-status-select"
                  >
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GC_STATUS_OPTIONS.map((option) => (
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

        <GCContactFields control={control} />
        <GCTermsFields control={control} />
      </CardContent>
    </Card>
  );
}
