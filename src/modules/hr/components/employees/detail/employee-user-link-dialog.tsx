import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { generateEmployeePassword } from '@/modules/hr/lib/employee-auth.utils';
import {
  linkEmployeeUserInputSchema,
  type Employee,
  type EmployeeAuthRole,
  type LinkEmployeeUserInput,
} from '@/modules/hr/schemas/employee.schema';

interface EmployeeUserLinkDialogProps {
  employee: Employee;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: LinkEmployeeUserInput) => void;
}

export function EmployeeUserLinkDialog({
  employee,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: EmployeeUserLinkDialogProps) {
  const { control, handleSubmit, reset, setValue } = useForm<LinkEmployeeUserInput>({
    resolver: zodResolver(linkEmployeeUserInputSchema),
    defaultValues: {
      role: 'user',
      password: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({ role: 'user', password: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Auth User</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit, onInvalidFormSubmit)}>
          <p className="text-sm text-muted-foreground">
            If an auth user already exists with this email, access will be restored and the
            temporary password below will replace the old password.
          </p>

          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input value={employee.email} readOnly />
          </Field>

          <Controller
            name="role"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Auth Role</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as EmployeeAuthRole)}
                >
                  <SelectTrigger aria-invalid={fieldState.invalid}>
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
                <FieldLabel>Temporary Password</FieldLabel>
                <InputWrapper>
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
                    onClick={() =>
                      setValue('password', generateEmployeePassword(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <KeyRound className="size-4" />
                  </Button>
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Linking...' : 'Link User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
