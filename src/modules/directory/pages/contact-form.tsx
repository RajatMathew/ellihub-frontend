import { useMemo, useState } from 'react';

import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  ContactFormContent,
  ContactFormLoading,
} from '@/modules/directory/components/contacts/form';
import {
  useContactDetailQuery,
  useProfessionalRolesQuery,
} from '@/modules/directory/hooks/contacts.hooks';
import { useGCsQuery } from '@/modules/directory/hooks/gc.hooks';
import {
  useVendorPickerOptions,
  type VendorPickerOption,
} from '@/modules/directory/hooks/vendors/use-vendor-picker-options';
import { useParams } from 'react-router-dom';

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const contactQuery = useContactDetailQuery(id ?? '');
  const rolesQuery = useProfessionalRolesQuery();
  const gcsQuery = useGCsQuery({ limit: 1000 });
  const [vendorSearch, setVendorSearch] = useState('');

  useBreadcrumbLabel(
    id ? `/app/directory/contacts/${id}` : undefined,
    contactQuery.data?.fullName ?? 'Contact'
  );

  const roles = rolesQuery.data ?? [];
  const selectedVendorOptions = useMemo<VendorPickerOption[]>(() => {
    const contact = contactQuery.data;
    if (!contact?.vendor) return [];
    return [
      {
        value: contact.vendor.id,
        label: contact.vendor.name,
      },
    ];
  }, [contactQuery.data]);
  const vendorPicker = useVendorPickerOptions({
    search: vendorSearch,
    selectedOptions: selectedVendorOptions,
    queryScope: 'contact-form-picker',
  });
  const vendorOptions = vendorPicker.options;
  const gcOptions = useMemo(
    () =>
      (gcsQuery.data?.data ?? []).map((gc) => ({
        value: gc.id,
        label: gc.name,
      })),
    [gcsQuery.data]
  );

  const isLoadingForm =
    rolesQuery.isLoading ||
    gcsQuery.isLoading ||
    (isEdit && contactQuery.isLoading);
  const isError =
    rolesQuery.isError ||
    gcsQuery.isError ||
    (isEdit && contactQuery.isError);

  if (isLoadingForm) {
    return <ContactFormLoading />;
  }

  if (isError) {
    return (
      <div className={formPageContainerClassName}>
        <QueryErrorState
          title="Unable to load contact form."
          description="The contact form options could not be loaded."
          onRetry={() => {
            void rolesQuery.refetch();
            void gcsQuery.refetch();
            if (isEdit) void contactQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (isEdit && !contactQuery.data) {
    return (
      <div className={formPageContainerClassName}>
        <QueryErrorState
          title="Contact not found."
          description="This contact may have been deleted or moved."
          onRetry={() => void contactQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <ContactFormContent
      key={contactQuery.data?.id ?? 'create-contact'}
      contact={contactQuery.data}
      contactId={id}
      gcOptions={gcOptions}
      isEdit={isEdit}
      roles={roles}
      vendorOptions={vendorOptions}
      vendorSearch={vendorSearch}
      onVendorSearchChange={setVendorSearch}
      isVendorLoading={vendorPicker.isLoading}
      isVendorFetchingNextPage={vendorPicker.isFetchingNextPage}
      hasMoreVendors={vendorPicker.hasNextPage}
      onFetchMoreVendors={vendorPicker.fetchNextPage}
    />
  );
}
