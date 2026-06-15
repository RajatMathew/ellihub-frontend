import { Controller, type Control } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { MemberFormInput, MemberRole } from '@/modules/settings/schemas/members.schema';

interface MemberRoleSelectProps {
  control: Control<MemberFormInput>;
  disabled?: boolean;
}

export function MemberRoleSelect({ control, disabled }: MemberRoleSelectProps) {
  return (
    <Controller
      name="role"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>Role</FieldLabel>
          <Select
            value={field.value}
            onValueChange={(value) => field.onChange(value as MemberRole)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
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
  );
}

