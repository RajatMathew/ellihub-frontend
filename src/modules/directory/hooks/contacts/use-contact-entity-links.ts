import { useMemo } from 'react';

import type { ContactEntityLink } from '@/modules/directory/components/contacts/detail/contact-detail.types';
import type { Contact } from '@/modules/directory/schemas/contact.schema';

export function useContactEntityLinks(contact?: Contact) {
  return useMemo(() => {
    const vendorLinks: ContactEntityLink[] =
      contact?.vendorLinks.map((link) => ({
        id: link.id,
        vendorId: link.vendorId,
        isPrimary: link.isPrimary,
        entityType: 'VENDOR',
        name: contact.vendor?.id === link.vendorId ? contact.vendor.name : link.vendorId,
      })) ?? [];

    if (contact?.vendor && !vendorLinks.some((link) => link.vendorId === contact.vendor?.id)) {
      vendorLinks.push({
        id: 'root-vendor',
        vendorId: contact.vendor.id,
        isPrimary: contact.isPrimary,
        entityType: 'VENDOR',
        name: contact.vendor.name,
      });
    }

    const gcLinks: ContactEntityLink[] =
      contact?.gcLinks.map((link) => ({
        id: link.id,
        generalContractorId: link.generalContractorId,
        isPrimary: link.isPrimary,
        entityType: 'GC',
        name:
          contact.generalContractor?.id === link.generalContractorId
            ? contact.generalContractor.name
            : link.generalContractorId,
      })) ?? [];

    if (
      contact?.generalContractor &&
      !gcLinks.some((link) => link.generalContractorId === contact.generalContractor?.id)
    ) {
      gcLinks.push({
        id: 'root-gc',
        generalContractorId: contact.generalContractor.id,
        isPrimary: contact.isPrimary,
        entityType: 'GC',
        name: contact.generalContractor.name,
      });
    }

    const allMergedLinks = [...vendorLinks, ...gcLinks];
    const primaryCompanyName =
      allMergedLinks.find((link) => link.isPrimary)?.name ?? allMergedLinks[0]?.name ?? null;

    return { allMergedLinks, primaryCompanyName };
  }, [contact]);
}
