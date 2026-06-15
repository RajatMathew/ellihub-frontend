import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { useAccess } from '@/app/contexts/access-context';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  ContactDetailDialogs,
  ContactDetailLoading,
  ContactDetailSidebar,
  ContactDetailStats,
  ContactDetailToolbar,
  ContactInfoCard,
  ContactPersonalDetailsCard,
} from '@/modules/directory/components/contacts/detail';
import {
  useContactDetailQuery,
  useDeleteContactMutation,
} from '@/modules/directory/hooks/contacts.hooks';
import { useContactActivity } from '@/modules/directory/hooks/contacts/use-contact-activity';
import { useContactEntityLinks } from '@/modules/directory/hooks/contacts/use-contact-entity-links';
import { useContactMethodEditor } from '@/modules/directory/hooks/contacts/use-contact-method-editor';
import { useContactTags } from '@/modules/directory/hooks/contacts/use-contact-tags';
import { useNavigate, useParams } from 'react-router-dom';

export function ContactDetailPage() {
  const { can } = useAccess();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: contact, isLoading, isError, refetch } = useContactDetailQuery(id ?? '');
  const deleteMutation = useDeleteContactMutation();

  useBreadcrumbLabel(
    id ? `/app/directory/contacts/${id}` : undefined,
    contact?.fullName ?? 'Contact'
  );

  const roleName = contact?.professionalRole?.label ?? contact?.professionalRole?.name ?? null;
  const { allMergedLinks, primaryCompanyName } = useContactEntityLinks(contact);
  const tagEditor = useContactTags(contact, id);
  const methodEditor = useContactMethodEditor(id);
  const contactActivity = useContactActivity(id);

  if (isLoading) {
    return <ContactDetailLoading />;
  }

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load contact."
          description="The contact details could not be loaded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Contact not found."
          description="This contact may have been deleted or moved."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const companyNames = allMergedLinks.map((link) => link.name);
  const canUpdateContact = can('contact', 'update');
  const canDeleteContact = can('contact', 'delete');

  return (
    <div className="container-fluid max-w-full overflow-x-hidden pb-5">
      <ContactDetailToolbar
        contactName={contact.fullName}
        roleName={roleName}
        primaryCompanyName={primaryCompanyName}
        sidebarOpen={sidebarOpen}
        canUpdate={canUpdateContact}
        canDelete={canDeleteContact}
        onOpenSidebar={() => setSidebarOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <ContactDetailStats
            roleName={roleName}
            entityCount={allMergedLinks.length}
            tagCount={contact.tags.length}
          />

          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            <ContactPersonalDetailsCard
              roleName={roleName}
              companyNames={companyNames}
              tags={contact.tags}
              tagEditor={tagEditor}
            />
            <ContactInfoCard contact={contact} editor={methodEditor} />
          </div>
        </div>

        <ContactDetailSidebar
          open={sidebarOpen}
          links={allMergedLinks}
          activityItems={contactActivity.items}
          isActivityLoading={contactActivity.isLoading}
          isActivityError={contactActivity.isError}
          onClose={() => setSidebarOpen(false)}
          onRetryActivity={() => void contactActivity.refetch()}
        />
      </div>

      <ContactDetailDialogs
        contact={contact}
        methods={methodEditor}
        deleteOpen={deleteOpen && canDeleteContact}
        isDeleting={deleteMutation.isPending}
        onDeleteOpenChange={setDeleteOpen}
        onDelete={() => {
          if (!id || !canDeleteContact) return;
          deleteMutation.mutate(id, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
      />
    </div>
  );
}
