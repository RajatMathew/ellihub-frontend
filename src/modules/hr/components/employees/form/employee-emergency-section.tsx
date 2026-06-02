import type { ReactNode } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { Contact2, Phone } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';

import { EmployeeFormFieldLabel, employeeInvalidControlClassName } from './employee-form-field';

type EmployeeEmergencyFieldName =
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation';

export function EmployeeEmergencySection({ control }: { control: Control<CreateEmployeeInput> }) {
  return (
    <Card id="emergency">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Emergency Information</h2>
          <p className="text-sm text-muted-foreground">Protocol contacts for critical incidents.</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <EmergencyField
            control={control}
            name="emergencyContactName"
            label="Contact Name"
            placeholder="Next of Kin"
            icon={<Contact2 className="size-4 text-muted-foreground" />}
          />
          <EmergencyField
            control={control}
            name="emergencyContactPhone"
            label="Contact Phone"
            placeholder="(555) 999-9999"
            icon={<Phone className="size-4 text-muted-foreground" />}
          />
          <EmergencyField
            control={control}
            name="emergencyContactRelation"
            label="Relationship"
            placeholder="e.g. Spouse, Parent"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EmergencyField({
  control,
  name,
  label,
  placeholder,
  icon,
}: {
  control: Control<CreateEmployeeInput>;
  name: EmployeeEmergencyFieldName;
  label: string;
  placeholder: string;
  icon?: ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <EmployeeFormFieldLabel>{label}</EmployeeFormFieldLabel>
          <InputWrapper
            className={fieldState.invalid ? employeeInvalidControlClassName : undefined}
          >
            {icon}
            <Input {...field} value={String(field.value ?? '')} placeholder={placeholder} />
          </InputWrapper>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
