import { useEffect, useMemo, useState } from 'react';

import type { LinkedContactItem } from '@/modules/directory/components/shared';
import {
  useContactsQuery,
  useVendorDetailQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks';
import {
  vendorFormSchema,
  type VendorContactLink,
  type VendorFormValues,
} from '@/modules/directory/schemas/vendor.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export function useVendorFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const vendorQuery = useVendorDetailQuery(id ?? '');
  const contactsQuery = useContactsQuery({ size: 1000 });
  const vendorTypesQuery = useVendorTypesQuery();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      email: '',
      type: '',
      status: 'ACTIVE',
      taxId: '',
      website: '',
      paymentTerms: 'NET_30',
    },
  });

  const [activeSection, setActiveSection] = useState('info');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactLinks, setContactLinks] = useState<LinkedContactItem[]>([]);
  const [originalLinks, setOriginalLinks] = useState<VendorContactLink[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isEdit || !vendorQuery.data || isInitialized) return;

    const vendor = vendorQuery.data;
    const typeValue =
      vendor.typeId || (typeof vendor.type === 'object' ? vendor.type?.id : vendor.type) || '';

    form.reset({
      name: vendor.name,
      email: vendor.email ?? '',
      website: vendor.website ?? '',
      paymentTerms: vendor.paymentTerms ?? '',
      type: typeValue,
      status: vendor.status,
      taxId: vendor.taxId ?? '',
    });

    const resolvedLinks = buildVendorContactLinks(vendor.id, vendor.contactLinks, vendor.contacts);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setOriginalLinks(resolvedLinks);
      setContactLinks(
        resolvedLinks.map((link) => ({
          contactId: link.contactId,
          isPrimary: link.isPrimary,
        }))
      );
      setIsInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [form, isEdit, isInitialized, vendorQuery.data]);

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.data ?? []).map((contact) => ({
        value: contact.id,
        label: contact.fullName,
      })),
    [contactsQuery.data]
  );

  const fillRandom = () => {
    const randomId = Math.floor(Math.random() * 10000);
    const randomType =
      vendorTypesQuery.data?.[Math.floor(Math.random() * vendorTypesQuery.data.length)]?.id;

    form.reset({
      name: `Random Vendor ${randomId}`,
      email: `vendor-${randomId}@example.com`,
      type: randomType ?? 'MATERIAL',
      status: Math.random() > 0.5 ? 'ACTIVE' : 'INACTIVE',
      taxId: `${Math.floor(10 + Math.random() * 89)}-${Math.floor(
        1000000 + Math.random() * 8999999
      )}`,
      website: `https://vendor-${randomId}.com`,
      paymentTerms: 'NET_30',
    });
  };

  const handleContactCreated = (contact: { id: string; fullName: string }) => {
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: false }]);
  };

  return {
    isEdit,
    form,
    vendorQuery,
    contacts: contactsQuery.data?.data ?? [],
    vendorTypes: vendorTypesQuery.data ?? [],
    contactOptions,
    activeSection,
    setActiveSection,
    contactDialogOpen,
    setContactDialogOpen,
    contactLinks,
    setContactLinks,
    originalLinks,
    fillRandom,
    handleContactCreated,
  };
}

function buildVendorContactLinks(
  vendorId: string,
  linkedContacts: VendorContactLink[] = [],
  contacts: VendorContactLink['contact'][] = []
) {
  const resolvedLinks = [...linkedContacts];

  contacts.forEach((contact) => {
    if (!contact || resolvedLinks.some((link) => link.contactId === contact.id)) return;

    resolvedLinks.push({
      id: contact.id,
      contactId: contact.id,
      vendorId,
      isPrimary: false,
      contact,
    });
  });

  return resolvedLinks;
}
