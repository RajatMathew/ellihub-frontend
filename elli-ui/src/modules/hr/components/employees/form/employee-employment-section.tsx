import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Switch } from '@/app/components/ui/switch';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { Calendar } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

interface EmployeeEmploymentSectionProps {
  control: Control<CreateEmployeeInput>;
  isEdit: boolean;
  roleOptions: { value: string; label: string }[];
}

export function EmployeeEmploymentSection({
  control,
  isEdit,
  roleOptions,
}: EmployeeEmploymentSectionProps) {
  return (
    <Card id="employment">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Employment Configuration
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Workforce placement and onboarding details.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="startDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                  Commencement Date
                </FieldLabel>
                <InputWrapper>
                  <Calendar className="size-4 text-muted-foreground" />
                  <Input {...field} type="date" value={field.value ?? ''} />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {!isEdit && (
            <Controller
              name="createAccount"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                    Create System Account
                  </FieldLabel>
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Auto-generate login credentials
                    </span>
                  </div>
                </Field>
              )}
            />
          )}

          <Controller
            name="roleId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-bold uppercase tracking-widest">
                  Professional Role
                </FieldLabel>
                <SearchableSelect
                  options={roleOptions}
                  value={field.value ?? ''}
                  onValueChange={(value) => field.onChange(value || '')}
                  placeholder="Select role..."
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
