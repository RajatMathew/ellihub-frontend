import { useState } from 'react';

import { changePassword } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const emptyPasswordValues: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ProfileSecurityCard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: emptyPasswordValues,
  });

  async function onSubmit(values: PasswordForm) {
    setIsSubmitting(true);

    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to change password.');
      }

      form.reset(emptyPasswordValues);
      toast.success('Password updated. Other sessions were signed out.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to change password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password and sign out other sessions.</CardDescription>
        </CardHeading>
      </CardHeader>
      <CardContent>
        <Separator className="mb-5" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <PasswordField
            control={form.control}
            name="currentPassword"
            label="Current Password"
            placeholder="Current password"
            visible={passwordVisible}
          />
          <PasswordField
            control={form.control}
            name="newPassword"
            label="New Password"
            placeholder="New password"
            visible={passwordVisible}
          />
          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm password"
            visible={passwordVisible}
          />
          <div className="flex items-center gap-2 md:col-span-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPasswordVisible((prev) => !prev)}
            >
              {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {passwordVisible ? 'Hide' : 'Show'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={form.handleSubmit(onSubmit, onInvalidFormSubmit)}
            >
              <KeyRound className="size-4" />
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  control,
  name,
  label,
  placeholder,
  visible,
}: {
  control: ReturnType<typeof useForm<PasswordForm>>['control'];
  name: keyof PasswordForm;
  label: string;
  placeholder: string;
  visible: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-bold uppercase tracking-widest">{label}</FieldLabel>
          <InputWrapper>
            <Input
              {...field}
              type={visible ? 'text' : 'password'}
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
