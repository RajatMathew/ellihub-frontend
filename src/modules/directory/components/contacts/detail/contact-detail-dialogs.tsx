import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { ContactMethodEditor } from '@/modules/directory/hooks/contacts/use-contact-method-editor';
import type { Contact } from '@/modules/directory/schemas/contact.schema';

interface ContactDetailDialogsProps {
  contact: Contact;
  methods: ContactMethodEditor;
  deleteOpen: boolean;
  isDeleting: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function ContactDetailDialogs({
  contact,
  methods,
  deleteOpen,
  isDeleting,
  onDeleteOpenChange,
  onDelete,
}: ContactDetailDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={methods.addPhoneConfirmOpen}
        onOpenChange={methods.setAddPhoneConfirmOpen}
        title="Add Phone Number"
        description={
          <>
            Add <strong>{methods.newPhone}</strong> ({methods.newPhoneLabel}) to {contact.fullName}?
          </>
        }
        confirmLabel="Add Number"
        onConfirm={methods.handleAddPhone}
        isPending={methods.isAddingPhone}
      />
      <ConfirmDialog
        open={methods.removePhoneConfirm}
        onOpenChange={methods.setRemovePhoneConfirm}
        title="Remove Phone Number"
        description={
          <>
            Remove <strong>{contact.phoneNumber[0]?.number ?? ''}</strong> from {contact.fullName}?
          </>
        }
        confirmLabel="Remove"
        onConfirm={methods.handleRemovePhone}
        variant="destructive"
        isPending={methods.isRemovingPhone}
      />
      <ConfirmDialog
        open={methods.addEmailConfirmOpen}
        onOpenChange={methods.setAddEmailConfirmOpen}
        title="Add Email Address"
        description={
          <>
            Add <strong>{methods.newEmail}</strong> ({methods.newEmailLabel}) to {contact.fullName}?
          </>
        }
        confirmLabel="Add Email"
        onConfirm={methods.handleAddEmail}
        isPending={methods.isAddingEmail}
      />
      <ConfirmDialog
        open={methods.removeEmailConfirm}
        onOpenChange={methods.setRemoveEmailConfirm}
        title="Remove Email Address"
        description={
          <>
            Remove <strong>{contact.email[0]?.email ?? ''}</strong> from {contact.fullName}?
          </>
        }
        confirmLabel="Remove"
        onConfirm={methods.handleRemoveEmail}
        variant="destructive"
        isPending={methods.isRemovingEmail}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Delete Contact Permanently"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{contact.fullName}</strong> and remove all associated data.
          </>
        }
        confirmLabel="Delete Permanently"
        onConfirm={onDelete}
        variant="destructive"
        isPending={isDeleting}
      />
    </>
  );
}
