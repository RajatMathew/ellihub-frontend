import { useMemo } from 'react';

import type { ContactEntityLink } from '@/modules/directory/components/contacts/detail/contact-detail.types';
import { useVendorsQuery } from '@/modules/directory/hooks/vendors.hooks';
import type { Contact } from '@/modules/directory/schemas/contact.schema';

export function useContactEntityLinks(contact?: Contact) {
  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });

  const vendorNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const vendor of vendorsData?.data ?? []) {
      names.set(vendor.id, vendor.name);
    }
    return names;
  }, [vendorsData]);

  return useMemo(() => {
    const vendorLinks: ContactEntityLink[] =
      contact?.vendorLinks.map((link) => ({
        id: link.id,
        vendorId: link.vendorId,
        isPrimary: link.isPrimary,
        entityType: 'VENDOR',
        name: vendorNames.get(link.vendorId) ?? link.vendorId,
      })) ?? [];

    if (contact?.vendor && !vendorLinks.some((link) => link.vendorId === contact.vendor?.id)) {
      vendorLinks.push({
        id: 'root-vendor',
        vendorId: contact.vendor.id,
        isPrimary: true,
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
        isPrimary: true,
        entityType: 'GC',
        name: contact.generalContractor.name,
      });
    }

    const allMergedLinks = [...vendorLinks, ...gcLinks];
    const primaryCompanyName =
      allMergedLinks.find((link) => link.isPrimary)?.name ?? allMergedLinks[0]?.name ?? null;

    return { allMergedLinks, primaryCompanyName };
  }, [contact, vendorNames]);
}
