import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { Textarea } from '@/app/components/ui/textarea';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import type { MemberSuspendInput, MemberUser } from '@/modules/settings/schemas/members.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const suspendFormSchema = z.object({
  banReason: z.string().trim().max(500).optional(),
});

type SuspendForm = z.infer<typeof suspendFormSchema>;

interface MemberSuspendDialogProps {
  member: MemberUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspend: (input: MemberSuspendInput) => void;
  isSubmitting: boolean;
}

export function MemberSuspendDialog({
  member,
  open,
  onOpenChange,
  onSuspend,
  isSubmitting,
}: MemberSuspendDialogProps) {
  const { control, handleSubmit, reset } = useForm<SuspendForm>({
    resolver: zodResolver(suspendFormSchema),
    defaultValues: { banReason: '' },
  });

  useEffect(() => {
    if (open) reset({ banReason: '' });
  }, [open, reset]);

  const closeDialog = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : closeDialog())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Member</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            if (!member) return;
            onSuspend({
              id: member.id,
              banReason: values.banReason?.trim() || undefined,
            });
          }, onInvalidFormSubmit)}
        >
          <p className="text-sm text-muted-foreground">
            Suspend <strong>{member?.name ?? 'this member'}</strong>? They will not be able to
            access the app until they are unsuspended.
          </p>

          <Controller
            name="banReason"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="member-suspend-reason">Reason</FieldLabel>
                <Textarea
                  id="member-suspend-reason"
                  {...field}
                  rows={4}
                  placeholder="Optional reason..."
                />
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Suspending...' : 'Suspend'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
