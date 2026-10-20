import { useEffect, type BaseSyntheticEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { useCreateContactMutation } from '@/modules/directory/hooks/contacts.hooks';
import { toQuickContactCreateInput } from '@/modules/directory/lib/contact-payload';
import {
  quickCreateContactSchema,
  type QuickCreateContactValues,
} from '@/modules/directory/schemas/contact.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ContactQuickFields } from './contact-quick-fields';

const EMPTY_QUICK_CONTACT_VALUES: QuickCreateContactValues = {
  fullName: '',
  professionalRoleId: undefined,
  professionalRoleLabel: '',
  email: '',
  phone: '',
};

export function QuickCreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: { id: string; fullName: string }) => void;
}) {
  const createMutation = useCreateContactMutation();
  const { control, handleSubmit, reset } = useForm<QuickCreateContactValues>({
    resolver: zodResolver(quickCreateContactSchema),
    defaultValues: EMPTY_QUICK_CONTACT_VALUES,
  });

  useEffect(() => {
    if (open) reset(EMPTY_QUICK_CONTACT_VALUES);
  }, [open, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: QuickCreateContactValues, e?: BaseSyntheticEvent) => {
    // The dialog renders in a portal, but React still bubbles its submit to the
    // vendor or GC form it was opened from.
    e?.stopPropagation();
    const created = await createMutation.mutateAsync(toQuickContactCreateInput(data));
    onCreated({ id: created.id, fullName: created.fullName });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            New Contact
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalidFormSubmit)} className="space-y-4">
          <ContactQuickFields control={control} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-8 rounded-sm px-3 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending}
              className="h-8 rounded-sm px-3 text-sm font-semibold"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
