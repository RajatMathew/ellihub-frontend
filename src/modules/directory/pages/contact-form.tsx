import { useMemo } from 'react';

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
import { useVendorsQuery } from '@/modules/directory/hooks/vendors.hooks';
import { useParams } from 'react-router-dom';

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const contactQuery = useContactDetailQuery(id ?? '');
  const rolesQuery = useProfessionalRolesQuery();
  const vendorsQuery = useVendorsQuery({ limit: 1000 });
  const gcsQuery = useGCsQuery({ limit: 1000 });

  useBreadcrumbLabel(
    id ? `/app/directory/contacts/${id}` : undefined,
    contactQuery.data?.fullName ?? 'Contact'
  );

  const roles = rolesQuery.data ?? [];
  const vendorOptions = useMemo(
    () =>
      (vendorsQuery.data?.data ?? []).map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
      })),
    [vendorsQuery.data]
  );
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
    vendorsQuery.isLoading ||
    gcsQuery.isLoading ||
    (isEdit && contactQuery.isLoading);
  const isError =
    rolesQuery.isError ||
    vendorsQuery.isError ||
    gcsQuery.isError ||
    (isEdit && contactQuery.isError);

  if (isLoadingForm) {
    return <ContactFormLoading />;
  }

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load contact form."
          description="The contact form options could not be loaded."
          onRetry={() => {
            void rolesQuery.refetch();
            void vendorsQuery.refetch();
            void gcsQuery.refetch();
            if (isEdit) void contactQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (isEdit && !contactQuery.data) {
    return (
      <div className="container-fluid py-7.5">
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
    />
  );
}
