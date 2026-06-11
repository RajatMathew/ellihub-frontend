import type { ReactNode } from 'react';

import {
  FormFieldLabel,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { Calendar } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

const ptoInvalidControlClassName = formInvalidControlClassName;

interface PTOFormContentProps {
  control: Control<CreatePTOInput>;
  employeeOptions: SearchableSelectOption[];
  typeOptions: SearchableSelectOption[];
  showEmployeeSelector: boolean;
  hasCurrentEmployee: boolean;
  isEmployeesLoading: boolean;
  isAccessLoading: boolean;
  isTypesLoading: boolean;
}

export function PTOFormContent({
  control,
  employeeOptions,
  typeOptions,
  showEmployeeSelector,
  hasCurrentEmployee,
  isEmployeesLoading,
  isAccessLoading,
  isTypesLoading,
}: PTOFormContentProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 pt-4 pb-8 lg:pb-10">
      <Card>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Leave Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Specify the employee and timing for this absence.
            </p>
          </div>

          <Separator />

          {!hasCurrentEmployee && !isAccessLoading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Your user account is not linked to an employee profile. Please contact an admin before
              submitting a time off request.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {showEmployeeSelector && (
              <Controller
                name="employeeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <RequiredFieldLabel>Employee Selection</RequiredFieldLabel>
                    <SearchableSelect
                      options={employeeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search and select staff..."
                      disabled={isEmployeesLoading}
                      className={fieldState.invalid ? ptoInvalidControlClassName : undefined}
                      testId="pto-employee-select"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            <Controller
              name="typeId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <RequiredFieldLabel>PTO Category</RequiredFieldLabel>
                  <SearchableSelect
                    options={typeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select leave type..."
                    disabled={isTypesLoading}
                    className={fieldState.invalid ? ptoInvalidControlClassName : undefined}
                    testId="pto-type-select"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <DateField
              control={control}
              name="startDate"
              label="Commencement Date"
              testId="pto-start-date-input"
            />
            <DateField
              control={control}
              name="endDate"
              label="Conclusion Date"
              testId="pto-end-date-input"
            />
          </div>

          <Controller
            name="reason"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <RequiredFieldLabel>Justification / Notes</RequiredFieldLabel>
                <Textarea
                  {...field}
                  placeholder="Provide context for this leave request..."
                  className={cn(
                    'min-h-32 resize-none text-sm leading-relaxed',
                    fieldState.invalid && ptoInvalidControlClassName
                  )}
                  aria-invalid={fieldState.invalid}
                  data-testid="pto-reason-input"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RequiredFieldLabel({ children }: { children: ReactNode }) {
  return <FormFieldLabel required>{children}</FormFieldLabel>;
}

function DateField({
  control,
  name,
  label,
  testId,
}: {
  control: Control<CreatePTOInput>;
  name: 'startDate' | 'endDate';
  label: string;
  testId: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <RequiredFieldLabel>{label}</RequiredFieldLabel>
          <InputWrapper className={fieldState.invalid ? ptoInvalidControlClassName : undefined}>
            <Calendar className="size-4 text-muted-foreground" />
            <Input {...field} type="date" aria-invalid={fieldState.invalid} data-testid={testId} />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
