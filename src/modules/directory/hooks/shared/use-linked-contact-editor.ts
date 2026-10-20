import { useState } from 'react';

/**
 * Editing a linked contact's details from the vendor and GC forms: which
 * contact the edit dialog is for, whether it is open, and the names edited
 * since the form loaded.
 *
 * The contact id is kept after the dialog closes so it can fade out showing
 * that contact rather than an empty dialog.
 */
export function useLinkedContactEditor() {
  const [contactId, setContactId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  return {
    contactId,
    isOpen,
    setOpen: setIsOpen,
    editedNames,
    open: (id: string) => {
      setContactId(id);
      setIsOpen(true);
    },
    handleUpdated: (contact: { id: string; fullName: string }) =>
      setEditedNames((previous) => ({ ...previous, [contact.id]: contact.fullName })),
  };
}
