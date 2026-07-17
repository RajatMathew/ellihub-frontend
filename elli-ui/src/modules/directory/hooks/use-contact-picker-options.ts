import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import { contactsApi } from '@/modules/directory/api/contacts.api';
import type { Contact } from '@/modules/directory/schemas/contact.schema';

export type ContactPickerOption = InfiniteSearchSelectOption;

type UseContactPickerOptionsParams = {
  search: string;
  selectedOptions?: ContactPickerOption[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
};

function getPrimaryContactEmail(contact: Contact) {
  return (
    contact.email.find((email) => email.isPrimary)?.email ??
    contact.email[0]?.email ??
    contact.phoneNumber.find((phone) => phone.isPrimary)?.number ??
    contact.phoneNumber[0]?.number
  );
}

export function toContactPickerOption(contact: Contact): ContactPickerOption {
  const role = contact.professionalRole?.label ?? contact.professionalRole?.name;
  const detail = getPrimaryContactEmail(contact);

  return {
    value: contact.id,
    label: contact.fullName,
    description: [role, detail].filter(Boolean).join(' • ') || undefined,
    badge: contact.vendorId ? 'Vendor' : contact.generalContractorId ? 'GC' : undefined,
  };
}

export function useContactPickerOptions({
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
}: UseContactPickerOptionsParams) {
  return useInfiniteSelectOptions({
    queryKey: ['contacts', queryScope, search, pageSize],
    queryFn: (page) =>
      contactsApi.list({
        search: search || undefined,
        page,
        size: pageSize,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    mapItemToOption: toContactPickerOption,
    selectedOptions,
    enabled,
  });
}
