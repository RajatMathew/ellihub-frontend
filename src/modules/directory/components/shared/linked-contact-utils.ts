import type { ImportSource } from '@/app/lib/import-source';

import type { LinkedContactNameSource, LinkedContactOriginalLink } from './linked-contacts-section';

export interface DirectoryContactSnapshot {
  id: string;
  fullName: string;
  email?: { email: string }[];
  phoneNumber?: { number: string }[];
  isPrimary?: boolean;
  /** Where the contact came from, if a migration workbook listed it. */
  importSource?: ImportSource | null;
}

export interface DirectoryContactLinkSnapshot<TContact extends DirectoryContactSnapshot> {
  contactId: string;
  isPrimary?: boolean;
  contact?: TContact | null;
}

export function mergeLinkedContacts<TContact extends DirectoryContactSnapshot>(
  contacts: TContact[] = [],
  contactLinks: DirectoryContactLinkSnapshot<TContact>[] = []
) {
  const contactMap = new Map<string, TContact & { isPrimary: boolean }>();

  contacts.forEach((contact) => {
    contactMap.set(contact.id, {
      ...contact,
      isPrimary: contact.isPrimary ?? false,
    });
  });

  contactLinks.forEach((link) => {
    if (!link.contact) return;

    const existing = contactMap.get(link.contact.id);
    contactMap.set(link.contact.id, {
      ...(existing ?? link.contact),
      isPrimary: Boolean(existing?.isPrimary || link.isPrimary),
    });
  });

  return Array.from(contactMap.values()).sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

/**
 * The name a linked contact row shows. The form's own contact list comes
 * first: it carries a name edited since the page loaded, where the saved links
 * still hold the name from before.
 */
export function getLinkedContactName(
  contactId: string,
  contacts: LinkedContactNameSource[],
  originalLinks: LinkedContactOriginalLink[],
  contactOptions: { value: string; label: string }[]
) {
  return (
    contacts.find((contact) => contact.id === contactId)?.fullName ||
    originalLinks.find((link) => link.contactId === contactId)?.contact?.fullName ||
    contactOptions.find((option) => option.value === contactId)?.label ||
    contactId
  );
}

/**
 * The form's contacts with the names edited on it since it loaded. Only the
 * name is replaced: the rest of each contact — its current vendor or GC, which
 * decides whether linking it asks to replace that link — stays as it was.
 */
export function withEditedContactNames(
  contacts: LinkedContactNameSource[],
  editedNames: Readonly<Record<string, string>>
): LinkedContactNameSource[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]));

  for (const [id, fullName] of Object.entries(editedNames)) {
    byId.set(id, { ...byId.get(id), id, fullName });
  }

  return Array.from(byId.values());
}
