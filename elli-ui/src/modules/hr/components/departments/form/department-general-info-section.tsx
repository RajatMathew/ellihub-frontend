import {
  FormFieldLabel,
  formFieldLabelClassName,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { CreateDepartmentInput } from '@/modules/hr/schemas/department.schema';
import { Building2 } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

const departmentInvalidControlClassName = formInvalidControlClassName;

const departmentFieldLabelClassName = formFieldLabelClassName;

interface DepartmentGeneralInfoSectionProps {
  control: Control<CreateDepartmentInput>;
}

export function DepartmentGeneralInfoSection({ control }: DepartmentGeneralInfoSectionProps) {
  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">General Information</h2>
          <p className="text-sm text-muted-foreground">
            Basic details that identify the department.
          </p>
        </div>

        <Separator />

        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormFieldLabel required>Department Name</FormFieldLabel>
              <InputWrapper
                className={fieldState.invalid ? departmentInvalidControlClassName : undefined}
              >
                <Building2 className="size-4 text-muted-foreground" />
                <Input
                  {...field}
                  placeholder="e.g. Engineering, Sales, Human Resources"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  data-testid="department-name-input"
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
              <FieldLabel className={departmentFieldLabelClassName}>Description</FieldLabel>
              <Textarea
                {...field}
                placeholder="Describe the department's core responsibilities and functions..."
                className={cn(
                  'min-h-32 resize-none',
                  fieldState.invalid && departmentInvalidControlClassName
                )}
                aria-invalid={fieldState.invalid}
                data-testid="department-description-input"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
