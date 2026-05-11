import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
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
          <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
            General Information
          </h2>
          <p className="text-sm text-muted-foreground">Core entity details and classification.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  GC Name
                </FieldLabel>
                <InputWrapper>
                  <Input
                    {...field}
                    placeholder="e.g. Navillus Inc."
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
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
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  GC Type
                </FieldLabel>
                <SearchableSelect
                  options={gcTypeOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value || '')}
                  placeholder="Select GC type..."
                  searchPlaceholder="Search types..."
                  emptyMessage="No types found."
                  disabled={gcTypeOptions.length === 0}
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
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Official Website
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
            name="status"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                  Initial Status
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
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
