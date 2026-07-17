import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
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
import { generateMemberPassword } from '@/modules/settings/lib/members.utils';
import type {
  MemberPasswordResetInput,
  MemberUser,
} from '@/modules/settings/schemas/members.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, KeyRound } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const resetPasswordFormSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  revokeSessions: z.boolean(),
});

type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;

interface MemberResetPasswordDialogProps {
  member: MemberUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: (input: MemberPasswordResetInput) => void;
  isSubmitting: boolean;
}

export function MemberResetPasswordDialog({
  member,
  open,
  onOpenChange,
  onReset,
  isSubmitting,
}: MemberResetPasswordDialogProps) {
  const { control, handleSubmit, reset, setValue } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: '',
      revokeSessions: true,
    },
  });
  const password = useWatch({ control, name: 'newPassword' });

  useEffect(() => {
    if (!open) return;
    reset({ newPassword: generateMemberPassword(), revokeSessions: true });
  }, [open, reset]);

  const closeDialog = () => {
    reset();
    onOpenChange(false);
  };

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    toast.success('Password copied.');
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : closeDialog())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            if (!member) return;
            onReset({
              id: member.id,
              newPassword: values.newPassword,
              revokeSessions: values.revokeSessions,
            });
          }, onInvalidFormSubmit)}
        >
          <p className="text-sm text-muted-foreground">
            Set a new temporary password for <strong>{member?.name ?? 'this member'}</strong>.
          </p>

          <Controller
            name="newPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-member-password">Temporary Password</FieldLabel>
                <InputWrapper>
                  <Input
                    id="reset-member-password"
                    {...field}
                    type="text"
                    aria-invalid={fieldState.invalid}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={() =>
                      setValue('newPassword', generateMemberPassword(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" mode="icon" size="sm" onClick={copyPassword}>
                    <Copy className="size-4" />
                  </Button>
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="revokeSessions"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                Sign this member out of existing sessions
              </label>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
