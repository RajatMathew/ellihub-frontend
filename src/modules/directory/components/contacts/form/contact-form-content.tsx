import { useState } from 'react';

import { FormPageShell } from '@/app/components/form-page-shell';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { fakeContactEmail, fakeContactName, fakePhone } from '@/lib/fake-data';
import type { DirectorySelectOption } from '@/modules/directory/components/contacts/form/contact-form.types';
import { CONTACT_FORM_SECTIONS } from '@/modules/directory/constants/contacts/contact-form.constants';
import { useContactAssociations } from '@/modules/directory/hooks/contacts/use-contact-associations';
import { useContactFormState } from '@/modules/directory/hooks/contacts/use-contact-form-state';
import { useSaveContact } from '@/modules/directory/hooks/contacts/use-save-contact';
import type {
  Contact,
  ContactFormValues,
  ProfessionalRole,
} from '@/modules/directory/schemas/contact.schema';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ContactAssociationSection } from './contact-association-section';
import { ContactFormDialogs } from './contact-form-dialogs';
import { ContactFormToolbar } from './contact-form-toolbar';
import { ContactInfoFormSection } from './contact-info-form-section';

interface ContactFormContentProps {
  contact: Contact | undefined;
  contactId: string | undefined;
  gcOptions: DirectorySelectOption[];
  isEdit: boolean;
  roles: ProfessionalRole[];
  vendorOptions: DirectorySelectOption[];
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  isVendorLoading?: boolean;
  isVendorFetchingNextPage?: boolean;
  hasMoreVendors?: boolean;
  onFetchMoreVendors?: () => void;
}

export function ContactFormContent({
  contact,
  contactId,
  gcOptions,
  isEdit,
  roles,
  vendorOptions,
  vendorSearch,
  onVendorSearchChange,
  isVendorLoading = false,
  isVendorFetchingNextPage = false,
  hasMoreVendors = false,
  onFetchMoreVendors,
}: ContactFormContentProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('contact-info');
  const form = useContactFormState({ contact, isEdit, roles });
  const { control, handleSubmit, reset, formState } = form;

  const associations = useContactAssociations({
    contact,
    isEdit,
    vendorOptions,
    gcOptions,
  });
  const { saveContact, isSubmitting } = useSaveContact({
    contactId,
    isEdit,
    primaryVendorId: associations.primaryVendorId,
    primaryGCId: associations.primaryGCId,
    isPrimary: associations.selectedAssociationIsPrimary,
    initialAssociation: associations.initialAssociation,
    onSaved: () => navigate('..', { relative: 'path' }),
  });

  const handleFillRandom = () => {
    const name = fakeContactName();
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    reset({
      fullName: name,
      professionalRoleId: randomRole?.id,
      email: { email: fakeContactEmail(name), label: 'Work' },
      phoneNumber: {
        number: fakePhone(),
        label: 'Office',
      },
      tags: ['Test', 'Random'],
    } satisfies Partial<ContactFormValues>);
    toast.info('Form filled with test data.');
  };

  return (
    <>
      <FormPageShell
        onSubmit={handleSubmit(saveContact, onInvalidFormSubmit)}
        sections={CONTACT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        renderToolbar={(className) => (
          <ContactFormToolbar
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            onFillRandom={handleFillRandom}
            className={className}
          />
        )}
      >
        <div className="space-y-6 pt-4 pb-8 lg:pb-10">
          <ContactInfoFormSection
            control={control}
            formState={formState}
            roles={roles}
            isLoadingRoles={false}
          />
          <ContactAssociationSection
            associations={associations}
            vendorOptions={vendorOptions}
            vendorSearch={vendorSearch}
            onVendorSearchChange={onVendorSearchChange}
            isVendorLoading={isVendorLoading}
            isVendorFetchingNextPage={isVendorFetchingNextPage}
            hasMoreVendors={hasMoreVendors}
            onFetchMoreVendors={onFetchMoreVendors}
            gcOptions={gcOptions}
          />
        </div>
      </FormPageShell>

      <ContactFormDialogs
        associations={associations}
        vendorOptions={vendorOptions}
        gcOptions={gcOptions}
      />
    </>
  );
}
