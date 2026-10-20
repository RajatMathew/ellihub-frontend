import { useEffect, useMemo, useRef, useState } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import {
  fakeGCName,
  fakePhone,
  fakeStreetAddress,
  fakeVendorEmail,
  fakeVendorWebsite,
  pickRandom,
} from '@/lib/fake-data';
import {
  withEditedContactNames,
  type LinkedContactItem,
  type LinkedContactNameSource,
} from '@/modules/directory/components/shared';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import {
  useContactPickerOptions,
  useGCDetailQuery,
  useGCTypesQuery,
} from '@/modules/directory/hooks';
import { useLinkedContactEditor } from '@/modules/directory/hooks/shared';
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
  const [pickedContacts, setPickedContacts] = useState<LinkedContactNameSource[]>([]);
  const [originalLinks, setOriginalLinks] = useState<GCContactLink[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const contactEditor = useLinkedContactEditor();
  const initializedGcIdRef = useRef<string | null>(null);

  const selectedContactOptions = useMemo<InfiniteSearchSelectOption[]>(() => {
    const map = new Map<string, InfiniteSearchSelectOption>();
    for (const link of originalLinks) {
      if (link.contact?.fullName) {
        map.set(link.contactId, { value: link.contactId, label: link.contact.fullName });
      }
    }
    for (const contact of createdContacts) {
      map.set(contact.id, { value: contact.id, label: contact.fullName });
    }
    for (const contact of pickedContacts) {
      map.set(contact.id, { value: contact.id, label: contact.fullName });
    }
    return Array.from(map.values());
  }, [createdContacts, originalLinks, pickedContacts]);

  const contactPicker = useContactPickerOptions({
    search: contactSearch,
    selectedOptions: selectedContactOptions,
    queryScope: 'gc-form',
  });

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
    for (const contact of contactPicker.items) {
      map.set(contact.id, contact);
    }
    for (const link of originalLinks) {
      if (link.contact?.fullName) {
        map.set(link.contactId, {
          ...link.contact,
          id: link.contactId,
          fullName: link.contact.fullName,
        });
      }
    }
    for (const contact of createdContacts) {
      map.set(contact.id, contact);
    }
    for (const contact of pickedContacts) {
      map.set(contact.id, contact);
    }
    return withEditedContactNames(Array.from(map.values()), contactEditor.editedNames);
  }, [
    contactEditor.editedNames,
    contactPicker.items,
    createdContacts,
    originalLinks,
    pickedContacts,
  ]);

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

  const handleContactSelected = (contact: LinkedContactNameSource) => {
    setPickedContacts((prev) =>
      prev.some((existing) => existing.id === contact.id) ? prev : [...prev, contact]
    );
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
    contactSearch,
    setContactSearch,
    isContactLoading: contactPicker.isLoading,
    isContactFetchingNextPage: contactPicker.isFetchingNextPage,
    hasMoreContacts: contactPicker.hasNextPage,
    fetchMoreContacts: contactPicker.fetchNextPage,
    fillRandom,
    handleContactCreated,
    handleContactSelected,
    contactEditor,
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
