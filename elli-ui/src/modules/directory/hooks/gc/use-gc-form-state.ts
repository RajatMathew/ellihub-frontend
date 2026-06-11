import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fakeGCName,
  fakePhone,
  fakeStreetAddress,
  fakeVendorEmail,
  fakeVendorWebsite,
  pickRandom,
} from '@/lib/fake-data';
import type {
  LinkedContactItem,
  LinkedContactNameSource,
} from '@/modules/directory/components/shared';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import { useContactsQuery, useGCDetailQuery, useGCTypesQuery } from '@/modules/directory/hooks';
import {
  gcFormSchema,
  gcStatusSchema,
  paymentTermsSchema,
  type GCContactLink,
  type GCFormValues,
  type GeneralContractorDetail,
} from '@/modules/directory/schemas/gc.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export function useGCFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const gcQuery = useGCDetailQuery(id ?? '');
  const gcTypesQuery = useGCTypesQuery();
  const contactsQuery = useContactsQuery({ size: 1000 });

  const form = useForm<GCFormValues>({
    resolver: zodResolver(gcFormSchema),
    defaultValues: {
      name: '',
      gcTypeId: '',
      website: '',
      status: 'ACTIVE',
      email: '',
      phone: '',
      address: '',
      paymentTerms: 'NET_30',
      retainagePercent: 10,
    },
  });

  const [activeSection, setActiveSection] = useState('info');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactLinks, setContactLinks] = useState<LinkedContactItem[]>([]);
  const [createdContacts, setCreatedContacts] = useState<LinkedContactNameSource[]>([]);
  const [originalLinks, setOriginalLinks] = useState<GCContactLink[]>([]);
  const initializedGcIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEdit || !gcQuery.data || initializedGcIdRef.current === gcQuery.data.id) return;

    const gc = gcQuery.data;
    form.reset({
      name: gc.name,
      gcTypeId: gc.gcTypeId || gc.gcType?.id || '',
      website: gc.website ?? '',
      status: getGCStatusFormValue(gc),
      email: gc.email ?? '',
      phone: gc.phone ?? '',
      address: gc.address ?? '',
      paymentTerms: getGCPaymentTermsFormValue(gc),
      retainagePercent: gc.retainagePercent,
    });

    const resolvedLinks = buildGCContactLinks(gc.id, gc.contactLinks, gc.contacts);
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
      initializedGcIdRef.current = gc.id;
    });

    return () => {
      cancelled = true;
    };
  }, [form, gcQuery.data, isEdit]);

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

  const gcTypeOptions = useMemo(
    () =>
      (gcTypesQuery.data ?? []).map((type) => ({
        value: type.id,
        label: type.label || type.name || 'Unknown',
      })),
    [gcTypesQuery.data]
  );

  const fillRandom = () => {
    const gcTypes = gcTypesQuery.data ?? [];
    if (gcTypes.length === 0) {
      toast.error('No GC types available to pick from.');
      return;
    }

    const randomType = gcTypes[Math.floor(Math.random() * gcTypes.length)];
    const name = fakeGCName();

    form.reset({
      name,
      gcTypeId: randomType.id,
      website: fakeVendorWebsite(name),
      status: 'ACTIVE',
      email: fakeVendorEmail(name),
      phone: fakePhone(),
      address: fakeStreetAddress(),
      paymentTerms: pickRandom(PAYMENT_TERMS_OPTIONS).value,
      retainagePercent: 10,
    });
    toast.info('Form filled with test data.');
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
    gcQuery,
    contacts,
    gcTypes: gcTypesQuery.data ?? [],
    gcTypeOptions,
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

function getGCStatusFormValue(gc: GeneralContractorDetail) {
  const result = gcStatusSchema.safeParse(gc.status);
  return result.success ? result.data : 'ACTIVE';
}

function getGCPaymentTermsFormValue(gc: GeneralContractorDetail) {
  const result = paymentTermsSchema.safeParse(gc.paymentTerms);
  return result.success ? result.data : 'NET_30';
}

function buildGCContactLinks(
  generalContractorId: string,
  linkedContacts: GCContactLink[] = [],
  contacts: GCContactLink['contact'][] = []
) {
  const resolvedLinks = [...linkedContacts];

  contacts.forEach((contact) => {
    if (!contact || resolvedLinks.some((link) => link.contactId === contact.id)) return;

    resolvedLinks.push({
      id: contact.id,
      contactId: contact.id,
      generalContractorId,
      isPrimary: contact.isPrimary ?? false,
      contact,
    });
  });

  return resolvedLinks;
}
