import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { FormPageShell } from '@/app/components/form-page-shell';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { QuickCreateContactDialog } from '@/modules/directory/components/quick-create-contact-dialog';
import { DirectoryFormLoading } from '@/modules/directory/components/shared';
import { VendorFormContent, VendorFormToolbar } from '@/modules/directory/components/vendors/form';
import { VENDOR_FORM_SECTIONS } from '@/modules/directory/constants/vendors.constants';
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
      <div className={formPageContainerClassName}>
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
      <div className={formPageContainerClassName}>
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
      <FormPageShell
        onSubmit={handleSubmit(saveVendor, onInvalidFormSubmit)}
        sections={VENDOR_FORM_SECTIONS}
        activeSection={state.activeSection}
        onSectionChange={state.setActiveSection}
        renderToolbar={(className) => (
          <VendorFormToolbar
            isEdit={state.isEdit}
            isSubmitting={isSubmitting}
            onFillRandom={state.fillRandom}
            className={className}
          />
        )}
      >
        <VendorFormContent
          control={control}
          vendorTypes={state.vendorTypes}
          contactLinks={state.contactLinks}
          originalLinks={state.originalLinks}
          contacts={state.contacts}
          contactOptions={state.contactOptions}
          targetEntityId={id}
          onContactLinksChange={state.setContactLinks}
          onCreateContact={() => state.setContactDialogOpen(true)}
        />
      </FormPageShell>

      <QuickCreateContactDialog
        open={state.contactDialogOpen}
        onOpenChange={state.setContactDialogOpen}
        onCreated={state.handleContactCreated}
      />
    </>
  );
}
