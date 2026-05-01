import { QueryErrorState } from '@/app/components/query-error-state';
import { GCFormContent, GCFormToolbar } from '@/modules/directory/components/gc/form';
import { QuickCreateContactDialog } from '@/modules/directory/components/quick-create-contact-dialog';
import { DirectoryFormLoading } from '@/modules/directory/components/shared';
import { useGCFormState } from '@/modules/directory/hooks/gc/use-gc-form-state';
import { useSaveGC } from '@/modules/directory/hooks/gc/use-save-gc';
import { useNavigate, useParams } from 'react-router-dom';

export function GCFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useGCFormState(id);
  const { handleSubmit, control } = state.form;

  const { saveGC, isSubmitting } = useSaveGC({
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

  if (state.isEdit && state.gcQuery.isLoading) {
    return <DirectoryFormLoading />;
  }

  if (state.isEdit && state.gcQuery.isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load general contractor."
          description="The general contractor details could not be loaded."
          onRetry={() => void state.gcQuery.refetch()}
        />
      </div>
    );
  }

  if (state.isEdit && !state.gcQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="General contractor not found."
          description="This general contractor may have been deleted or moved."
          onRetry={() => void state.gcQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(saveGC)} className="container-fluid py-7.5">
        <GCFormToolbar
          isEdit={state.isEdit}
          isSubmitting={isSubmitting}
          onFillRandom={state.fillRandom}
        />

        <GCFormContent
          control={control}
          activeSection={state.activeSection}
          gcTypeOptions={state.gcTypeOptions}
          contactLinks={state.contactLinks}
          originalLinks={state.originalLinks}
          contacts={state.contacts}
          contactOptions={state.contactOptions}
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
