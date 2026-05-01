import type { ReactNode } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { Mail, MapPin, Phone, UserPlus } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

type EmployeeBasicFieldName = 'name' | 'email' | 'phoneNumber' | 'address';

export function EmployeeBasicInfoSection({ control }: { control: Control<CreateEmployeeInput> }) {
  return (
    <Card id="info">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Personal Identity
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Fundamental identifying information for the employee.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EmployeeTextField
            control={control}
            name="name"
            label="Full Legal Name"
            placeholder="e.g. Robert J. Oppenheimer"
            icon={<UserPlus className="size-4 text-muted-foreground" />}
          />
          <EmployeeTextField
            control={control}
            name="email"
            label="Work Email Address"
            placeholder="robert@contractor-corp.com"
            type="email"
            icon={<Mail className="size-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EmployeeTextField
            control={control}
            name="phoneNumber"
            label="Contact Number"
            placeholder="(555) 000-0000"
            icon={<Phone className="size-4 text-muted-foreground" />}
          />
          <EmployeeTextField
            control={control}
            name="address"
            label="Physical Address"
            placeholder="123 Industrial St, NY"
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
  placeholder,
  type = 'text',
  icon,
}: {
  control: Control<CreateEmployeeInput>;
  name: EmployeeBasicFieldName;
  label: string;
  placeholder: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-bold uppercase tracking-widest">{label}</FieldLabel>
          <InputWrapper>
            {icon}
            <Input
              {...field}
              value={String(field.value ?? '')}
              type={type}
              placeholder={placeholder}
              autoComplete="off"
            />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
