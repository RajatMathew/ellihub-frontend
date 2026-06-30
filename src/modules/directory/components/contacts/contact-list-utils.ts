import type { Contact } from '@/modules/directory/schemas/contact.schema';

export interface ContactLinkedEntity {
  id: string;
  name: string;
  type: 'GC' | 'VENDOR';
}

export function getContactLinkedEntities(
  contact: Contact,
  vendorNames: Map<string, string>,
): ContactLinkedEntity[] {
  const links: ContactLinkedEntity[] = [];

  if (contact.vendor) {
    links.push({ id: contact.vendor.id, name: contact.vendor.name, type: 'VENDOR' });
  }

  if (contact.generalContractor) {
    links.push({
      id: contact.generalContractor.id,
      name: contact.generalContractor.name,
      type: 'GC',
    });
  }

  for (const link of contact.vendorLinks ?? []) {
    if (!links.some((existing) => existing.id === link.vendorId)) {
      links.push({
        id: link.vendorId,
        name: vendorNames.get(link.vendorId) ?? link.vendorId,
        type: 'VENDOR',
      });
    }
  }

  for (const link of contact.gcLinks ?? []) {
    if (!links.some((existing) => existing.id === link.generalContractorId)) {
      links.push({
        id: link.generalContractorId,
        name: link.generalContractorId,
        type: 'GC',
      });
    }
  }

  return links;
}
