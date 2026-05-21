import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { QuickCreateContactDialog } from '@/modules/directory/components/quick-create-contact-dialog';
import { DirectoryFormLoading } from '@/modules/directory/components/shared';
import { VendorFormContent, VendorFormToolbar } from '@/modules/directory/components/vendors/form';
import { useSaveVendor } from '@/modules/directory/hooks/vendors/use-save-vendor';
import { useVendorFormState } from '@/modules/directory/hooks/vendors/use-vendor-form-state';
import { useNavigate, useParams } from 'react-router-dom';

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useVendorFormState(id);
  const { handleSubmit, control } = state.form;

  useBreadcrumbLabel(
    id ? `/app/directory/vendors/${id}` : undefined,
    state.vendorQuery.data?.name ?? 'Vendor'
  );

  const { saveVendor, isSubmitting } = useSaveVendor({
    id,
    isEdit: state.isEdit,
    contactLinks: state.contactLinks,
    originalLinks: state.originalLinks,
    onSaved: (createdId) => {
      if (createdId) {
        navigate(`../${createdId}`, { relative: 'path' });
        return;
      }
      navigate('..', { relative: 'path' });
    },
  });

  if (state.isEdit && state.vendorQuery.isLoading) {
    return <DirectoryFormLoading />;
  }

  if (state.isEdit && state.vendorQuery.isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load vendor."
          description="The vendor details could not be loaded."
          onRetry={() => void state.vendorQuery.refetch()}
        />
      </div>
    );
  }

  if (state.isEdit && !state.vendorQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Vendor not found."
          description="This vendor may have been deleted or moved."
          onRetry={() => void state.vendorQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(saveVendor, onInvalidFormSubmit)} className="container-fluid py-7.5">
        <VendorFormToolbar
          isEdit={state.isEdit}
          isSubmitting={isSubmitting}
          onFillRandom={state.fillRandom}
        />

        <VendorFormContent
          control={control}
          activeSection={state.activeSection}
          vendorTypes={state.vendorTypes}
          contactLinks={state.contactLinks}
          originalLinks={state.originalLinks}
          contacts={state.contacts}
          contactOptions={state.contactOptions}
          targetEntityId={id}
          onSectionChange={state.setActiveSection}
          onContactLinksChange={state.setContactLinks}
          onCreateContact={() => state.setContactDialogOpen(true)}
        />
      </form>

      <QuickCreateContactDialog
        open={state.contactDialogOpen}
        onOpenChange={state.setContactDialogOpen}
        onCreated={state.handleContactCreated}
      />
    </>
  );
}
