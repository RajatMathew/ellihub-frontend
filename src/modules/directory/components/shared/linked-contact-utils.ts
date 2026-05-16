export interface DirectoryContactSnapshot {
  id: string;
  fullName: string;
  email?: { email: string }[];
  phoneNumber?: { number: string }[];
  isPrimary?: boolean;
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
