import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fakeTaxId,
  fakeVendorEmail,
  fakeVendorName,
  fakeVendorWebsite,
  pickRandom,
} from '@/lib/fake-data';
import type {
  LinkedContactItem,
  LinkedContactNameSource,
} from '@/modules/directory/components/shared';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import {
  useContactsQuery,
  useVendorDetailQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks';
import {
  paymentTermsSchema,
  vendorFormSchema,
  vendorStatusSchema,
  type VendorContactLink,
  type VendorDetail,
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
  const [createdContacts, setCreatedContacts] = useState<LinkedContactNameSource[]>([]);
  const [originalLinks, setOriginalLinks] = useState<VendorContactLink[]>([]);
  const initializedVendorIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEdit || !vendorQuery.data || initializedVendorIdRef.current === vendorQuery.data.id) {
      return;
    }

    const vendor = vendorQuery.data;

    form.reset({
      name: vendor.name,
      email: vendor.email ?? '',
      website: vendor.website ?? '',
      paymentTerms: getVendorPaymentTermsFormValue(vendor),
      type: getVendorTypeFormValue(vendor),
      status: getVendorStatusFormValue(vendor),
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
      initializedVendorIdRef.current = vendor.id;
    });

    return () => {
      cancelled = true;
    };
  }, [form, isEdit, vendorQuery.data]);

  const contacts = useMemo(() => {
    const map = new Map<string, LinkedContactNameSource>();
    for (const contact of contactsQuery.data?.data ?? []) {
      map.set(contact.id, contact);
    }
    for (const contact of createdContacts) {
      map.set(contact.id, contact);
    }
    return Array.from(map.values());
  }, [contactsQuery.data?.data, createdContacts]);

  const contactOptions = useMemo(
    () =>
      contacts.map((contact) => ({
        value: contact.id,
        label: contact.fullName,
      })),
    [contacts]
  );

  const fillRandom = () => {
    const name = fakeVendorName();
    const vendorTypes = vendorTypesQuery.data ?? [];
    const randomType = vendorTypes.length > 0 ? pickRandom(vendorTypes).id : 'MATERIAL';

    form.reset({
      name,
      email: fakeVendorEmail(name),
      type: randomType,
      status: Math.random() > 0.5 ? 'ACTIVE' : 'INACTIVE',
      taxId: fakeTaxId(),
      website: fakeVendorWebsite(name),
      paymentTerms: pickRandom(PAYMENT_TERMS_OPTIONS).value,
    });
  };

  const handleContactCreated = (contact: { id: string; fullName: string }) => {
    setCreatedContacts((prev) =>
      prev.some((existing) => existing.id === contact.id) ? prev : [...prev, contact]
    );
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: prev.length === 0 }]);
  };

  return {
    isEdit,
    form,
    vendorQuery,
    contacts,
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

function getVendorTypeFormValue(vendor: VendorDetail) {
  if (vendor.typeId) return vendor.typeId;
  if (vendor.type && typeof vendor.type === 'object') return vendor.type.id;
  if (typeof vendor.type === 'string') return vendor.type;

  return '';
}

function getVendorStatusFormValue(vendor: VendorDetail) {
  const result = vendorStatusSchema.safeParse(vendor.status);
  return result.success ? result.data : 'ACTIVE';
}

function getVendorPaymentTermsFormValue(vendor: VendorDetail) {
  const result = paymentTermsSchema.safeParse(vendor.paymentTerms);
  return result.success ? result.data : 'NET_30';
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
      isPrimary: contact.isPrimary ?? false,
      contact,
    });
  });

  return resolvedLinks;
}
