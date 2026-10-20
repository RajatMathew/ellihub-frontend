import { useEffect, useMemo, useRef, useState } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import {
  fakePhone,
  fakeStreetAddress,
  fakeTaxId,
  fakeVendorEmail,
  fakeVendorName,
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
  useVendorDetailQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks';
import { useLinkedContactEditor } from '@/modules/directory/hooks/shared';
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
  const vendorTypesQuery = useVendorTypesQuery();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      email: '',
      type: '',
      status: 'ACTIVE',
      taxId: '',
      phone: '',
      address: '',
      website: '',
      paymentTerms: 'NET_30',
    },
  });

  const [activeSection, setActiveSection] = useState('info');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactLinks, setContactLinks] = useState<LinkedContactItem[]>([]);
  const [createdContacts, setCreatedContacts] = useState<LinkedContactNameSource[]>([]);
  const [pickedContacts, setPickedContacts] = useState<LinkedContactNameSource[]>([]);
  const [originalLinks, setOriginalLinks] = useState<VendorContactLink[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const contactEditor = useLinkedContactEditor();
  const initializedVendorIdRef = useRef<string | null>(null);

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
    queryScope: 'vendor-form',
  });

  useEffect(() => {
    if (!isEdit || !vendorQuery.data || initializedVendorIdRef.current === vendorQuery.data.id) {
      return;
    }

    const vendor = vendorQuery.data;

    form.reset({
      name: vendor.name,
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
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
      phone: fakePhone(),
      address: fakeStreetAddress(),
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

  const handleContactSelected = (contact: LinkedContactNameSource) => {
    setPickedContacts((prev) =>
      prev.some((existing) => existing.id === contact.id) ? prev : [...prev, contact]
    );
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
