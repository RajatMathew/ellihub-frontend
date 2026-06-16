import type { ReactNode } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { Mail, MapPin, Phone, UserPlus } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

import { EmployeeFormFieldLabel, employeeInvalidControlClassName } from './employee-form-field';

type EmployeeBasicFieldName = 'name' | 'email' | 'phoneNumber' | 'address';

export function EmployeeBasicInfoSection({ control }: { control: Control<CreateEmployeeInput> }) {
  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personal Identity</h2>
          <p className="text-sm text-muted-foreground">
            Fundamental identifying information for the employee.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EmployeeTextField
            control={control}
            name="name"
            label="Full Legal Name"
            required
            placeholder="e.g. Robert J. Oppenheimer"
            testId="employee-name-input"
            icon={<UserPlus className="size-4 text-muted-foreground" />}
          />
          <EmployeeTextField
            control={control}
            name="email"
            label="Work Email Address"
            required
            placeholder="robert@contractor-corp.com"
            type="email"
            testId="employee-email-input"
            icon={<Mail className="size-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EmployeeTextField
            control={control}
            name="phoneNumber"
            label="Contact Number"
            placeholder="(555) 000-0000"
            testId="employee-phone-input"
            icon={<Phone className="size-4 text-muted-foreground" />}
          />
          <EmployeeTextField
            control={control}
            name="address"
            label="Physical Address"
            placeholder="123 Industrial St, NY"
            testId="employee-address-input"
            icon={<MapPin className="size-4 text-muted-foreground" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeTextField({
  control,
  name,
  label,
  required = false,
  placeholder,
  type = 'text',
  testId,
  icon,
}: {
  control: Control<CreateEmployeeInput>;
  name: EmployeeBasicFieldName;
  label: string;
  required?: boolean;
  placeholder: string;
  type?: string;
  testId?: string;
  icon?: ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <EmployeeFormFieldLabel required={required}>{label}</EmployeeFormFieldLabel>
          <InputWrapper
            className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
          >
            {icon}
            <Input
              {...field}
              value={String(field.value ?? '')}
              type={type}
              placeholder={placeholder}
              autoComplete="off"
              data-testid={testId}
            />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
