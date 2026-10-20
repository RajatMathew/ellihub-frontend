import type { BaseSyntheticEvent } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  useContactDetailQuery,
  useUpdateContactMutation,
} from '@/modules/directory/hooks/contacts.hooks';
import {
  toQuickContactFormValues,
  toQuickContactUpdateInput,
} from '@/modules/directory/lib/contact-payload';
import {
  quickCreateContactSchema,
  type Contact,
  type QuickCreateContactValues,
} from '@/modules/directory/schemas/contact.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ContactQuickFields } from './contact-quick-fields';

type UpdatedContact = { id: string; fullName: string };

/**
 * Edits a contact's details — name, role, email, phone — from the vendor and GC
 * forms. Saves to the contact straight away, as creating one there does; the
 * link to the vendor or GC, and Primary, stay with the form's own Save.
 */
export function QuickEditContactDialog({
  open,
  contactId,
  onOpenChange,
  onUpdated,
}: {
  open: boolean;
  /** The contact to edit. Kept after closing, so the dialog can fade out on it. */
  contactId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: (contact: UpdatedContact) => void;
}) {
  const contactQuery = useContactDetailQuery(contactId ?? '');
  const contact = contactQuery.data?.id === contactId ? contactQuery.data : undefined;

  return (
    <Dialog open={open && Boolean(contactId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            Edit Contact
          </DialogTitle>
          <DialogDescription>
            Changes save to the contact right away, everywhere it is used.
          </DialogDescription>
        </DialogHeader>

        {contactQuery.isError ? (
          <QueryErrorState
            title="Unable to load contact."
            description="The contact details could not be loaded."
            onRetry={() => void contactQuery.refetch()}
            className="py-8"
          />
        ) : contact ? (
          // Keyed so each contact gets a fresh form, filled once: a refetch
          // while the dialog is open does not overwrite what is being typed.
          <EditContactForm
            key={contact.id}
            contact={contact}
            onCancel={() => onOpenChange(false)}
            onSaved={(updated) => {
              onUpdated(updated);
              onOpenChange(false);
            }}
          />
        ) : (
          <div className="space-y-4" aria-busy="true" aria-label="Loading contact">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditContactForm({
  contact,
  onCancel,
  onSaved,
}: {
  contact: Contact;
  onCancel: () => void;
  onSaved: (contact: UpdatedContact) => void;
}) {
  const updateMutation = useUpdateContactMutation();
  const { control, handleSubmit } = useForm<QuickCreateContactValues>({
    resolver: zodResolver(quickCreateContactSchema),
    defaultValues: toQuickContactFormValues(contact),
  });

  const onSubmit = async (data: QuickCreateContactValues, e?: BaseSyntheticEvent) => {
    // The dialog renders in a portal, but React still bubbles its submit to the
    // vendor or GC form it was opened from.
    e?.stopPropagation();

    try {
      const updated = await updateMutation.mutateAsync({
        id: contact.id,
        data: toQuickContactUpdateInput(data, contact),
      });
      onSaved({ id: contact.id, fullName: updated.fullName });
    } catch {
      // The mutation has already said why; the dialog stays open to try again.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidFormSubmit)} className="space-y-4">
      <ContactQuickFields control={control} />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-8 rounded-sm px-3 text-sm font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateMutation.isPending}
          className="h-8 rounded-sm px-3 text-sm font-semibold"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Contact'}
        </Button>
      </DialogFooter>
    </form>
  );
}
