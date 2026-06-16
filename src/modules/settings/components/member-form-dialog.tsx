import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
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
import { MemberRoleSelect } from '@/modules/settings/components/member-role-select';
import {
  memberFormSchema,
  type MemberCreateInput,
  type MemberFormInput,
  type MemberUpdateInput,
  type MemberUser,
} from '@/modules/settings/schemas/members.schema';
import {
  generateMemberPassword,
  normalizeMemberRole,
} from '@/modules/settings/lib/members.utils';

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberUser | null;
  currentUserId?: string;
  onCreate: (data: MemberCreateInput) => void;
  onUpdate: (data: MemberUpdateInput) => void;
  isSubmitting: boolean;
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  currentUserId,
  onCreate,
  onUpdate,
  isSubmitting,
}: MemberFormDialogProps) {
  const isEditing = member != null;
  const isSelf = Boolean(member && member.id === currentUserId);

  const { control, handleSubmit, reset, setValue } = useForm<MemberFormInput>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
  });

  useEffect(() => {
    if (!open) return;

    reset(
      member
        ? {
            id: member.id,
            name: member.name,
            email: member.email,
            role: normalizeMemberRole(member.role),
          }
        : {
            name: '',
            email: '',
            password: '',
            role: 'user',
          }
    );
  }, [member, open, reset]);

  const closeDialog = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : closeDialog())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Member' : 'New Member'}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            if (isEditing && values.id) {
              onUpdate({
                id: values.id,
                name: values.name,
                email: values.email,
                role: values.role,
              });
              return;
            }

            onCreate({
              name: values.name,
              email: values.email,
              password: values.password ?? '',
              role: values.role,
            });
          }, onInvalidFormSubmit)}
        >
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="member-name">Name</FieldLabel>
                <Input id="member-name" {...field} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="member-email">Email</FieldLabel>
                <Input id="member-email" {...field} type="email" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {!isEditing && (
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="member-password">Temporary Password</FieldLabel>
                  <InputWrapper>
                    <Input
                      id="member-password"
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
                        setValue('password', generateMemberPassword(), {
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
          )}

          <MemberRoleSelect control={control} disabled={isSelf} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
