import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import type { CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { Calendar } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

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
    <div className="space-y-6 pt-6">
      <Card>
        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-foreground">
              Leave Configuration
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                    <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                      Employee Selection
                    </FieldLabel>
                    <SearchableSelect
                      options={employeeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search and select staff..."
                      disabled={isEmployeesLoading}
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
                  <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                    PTO Category
                  </FieldLabel>
                  <SearchableSelect
                    options={typeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select leave type..."
                    disabled={isTypesLoading}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <DateField control={control} name="startDate" label="Commencement Date" />
            <DateField control={control} name="endDate" label="Conclusion Date" />
          </div>

          <Controller
            name="reason"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                  Justification / Notes
                </FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Provide context for this leave request..."
                  className="min-h-32 resize-none text-sm leading-relaxed"
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

function DateField({
  control,
  name,
  label,
}: {
  control: Control<CreatePTOInput>;
  name: 'startDate' | 'endDate';
  label: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-bold uppercase tracking-widest">{label}</FieldLabel>
          <InputWrapper>
            <Calendar className="size-4 text-muted-foreground" />
            <Input {...field} type="date" />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
