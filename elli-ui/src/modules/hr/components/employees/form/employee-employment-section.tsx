import { Button } from '@/app/components/ui/button';
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
import { Switch } from '@/app/components/ui/switch';
import { generateEmployeePassword } from '@/modules/hr/lib/employee-auth.utils';
import type { CreateEmployeeInput, EmployeeAuthRole } from '@/modules/hr/schemas/employee.schema';
import { Calendar, KeyRound, ShieldCheck } from 'lucide-react';
import { Controller, useWatch, type Control } from 'react-hook-form';

import { EmployeeFormFieldLabel, employeeInvalidControlClassName } from './employee-form-field';

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
  const createAccount = useWatch({ control, name: 'createAccount' });

  return (
    <Card id="employment">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Employment Configuration</h2>
          <p className="text-sm text-muted-foreground">
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
                <EmployeeFormFieldLabel>Commencement Date</EmployeeFormFieldLabel>
                <InputWrapper
                  className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
                >
                  <Calendar className="size-4 text-muted-foreground" />
                  <Input
                    {...field}
                    type="date"
                    value={field.value ?? ''}
                    data-testid="employee-start-date-input"
                  />
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
                  <EmployeeFormFieldLabel>Link Auth User</EmployeeFormFieldLabel>
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span data-testid="employee-create-account-switch" className="sr-only">
                      {field.value ? 'enabled' : 'disabled'}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                      Create login access for this employee
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
                <EmployeeFormFieldLabel required>Professional Role</EmployeeFormFieldLabel>
                <SearchableSelect
                  options={roleOptions}
                  value={field.value ?? ''}
                  onValueChange={(value) => field.onChange(value || '')}
                  placeholder="Select role..."
                  className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
                  testId="employee-role-select"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {!isEdit && createAccount && (
            <>
              <Controller
                name="authRole"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <EmployeeFormFieldLabel required>Auth Role</EmployeeFormFieldLabel>
                    <Select
                      value={field.value ?? 'user'}
                      onValueChange={(value) => field.onChange(value as EmployeeAuthRole)}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid}
                        className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
                      >
                        <ShieldCheck className="me-1.5 size-4 text-muted-foreground" />
                        <SelectValue placeholder="Select auth role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dev">Dev</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="pm">PM</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <EmployeeFormFieldLabel required>Temporary Password</EmployeeFormFieldLabel>
                    <InputWrapper
                      className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
                    >
                      <Input
                        {...field}
                        type="text"
                        value={field.value ?? ''}
                        aria-invalid={fieldState.invalid}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        onClick={() => field.onChange(generateEmployeePassword())}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
