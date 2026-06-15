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
  const linkedEntityName = getLinkedEntityName(contact);
  const isLinked = Boolean(linkedEntityName);

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
        title={isLinked ? 'Cannot Delete Contact' : 'Delete Contact Permanently'}
        description={
          isLinked ? (
            <>
              <strong>{contact.fullName}</strong> is already linked to{' '}
              <strong>{linkedEntityName}</strong>. Unlink this contact from the vendor or GC before
              deleting it.
            </>
          ) : (
            <>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{contact.fullName}</strong> and remove all associated data.
            </>
          )
        }
        confirmLabel={isLinked ? 'Unlink First' : 'Delete Permanently'}
        onConfirm={onDelete}
        variant="destructive"
        isPending={isDeleting}
        confirmDisabled={isLinked}
      />
    </>
  );
}

function getLinkedEntityName(contact: Contact) {
  if (contact.vendor?.name) return `vendor ${contact.vendor.name}`;
  if (contact.generalContractor?.name) return `GC ${contact.generalContractor.name}`;
  if (contact.vendorId) return 'a vendor';
  if (contact.generalContractorId) return 'a GC';
  return null;
}
