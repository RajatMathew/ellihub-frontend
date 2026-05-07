import { useEffect, useMemo, useState } from 'react';

import { fakeGCName, fakePhone, fakeStreetAddress, fakeVendorEmail, fakeVendorWebsite, pickRandom } from '@/lib/fake-data';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import type { LinkedContactItem } from '@/modules/directory/components/shared';
import { useContactsQuery, useGCDetailQuery, useGCTypesQuery } from '@/modules/directory/hooks';
import {
  gcFormSchema,
  type GCContactLink,
  type GCFormValues,
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
  const [originalLinks, setOriginalLinks] = useState<GCContactLink[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isEdit || !gcQuery.data || isInitialized) return;

    const gc = gcQuery.data;
    form.reset({
      name: gc.name,
      gcTypeId: gc.gcTypeId || gc.gcType?.id || '',
      website: gc.website ?? '',
      status: gc.status,
      email: gc.email ?? '',
      phone: gc.phone ?? '',
      address: gc.address ?? '',
      paymentTerms: gc.paymentTerms ?? '',
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
      setIsInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [form, gcQuery.data, isEdit, isInitialized]);

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.data ?? []).map((contact) => ({
        value: contact.id,
        label: contact.fullName,
      })),
    [contactsQuery.data]
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
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: false }]);
  };

  return {
    isEdit,
    form,
    gcQuery,
    contacts: contactsQuery.data?.data ?? [],
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
      isPrimary: false,
      contact,
    });
  });

  return resolvedLinks;
}
