import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import type { CreateDepartmentInput } from '@/modules/hr/schemas/department.schema';
import { Building2 } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

interface DepartmentGeneralInfoSectionProps {
  control: Control<CreateDepartmentInput>;
}

export function DepartmentGeneralInfoSection({ control }: DepartmentGeneralInfoSectionProps) {
  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
            General Information
          </h2>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Basic details that identify the department.
          </p>
        </div>

        <Separator />

        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Department Name
              </FieldLabel>
              <InputWrapper>
                <Building2 className="size-4 text-muted-foreground" />
                <Input
                  {...field}
                  placeholder="e.g. Engineering, Sales, Human Resources"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Description
              </FieldLabel>
              <Textarea
                {...field}
                placeholder="Describe the department's core responsibilities and functions..."
                className="min-h-32 resize-none"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
