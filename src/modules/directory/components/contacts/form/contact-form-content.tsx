import { useState } from 'react';

import { FormSectionNav } from '@/app/components/form-section-nav';
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
}

export function ContactFormContent({
  contact,
  contactId,
  gcOptions,
  isEdit,
  roles,
  vendorOptions,
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
    initialAssociation: associations.initialAssociation,
    onSaved: () => navigate('..', { relative: 'path' }),
  });

  const handleFillRandom = () => {
    const randomSuffix = Math.floor(Math.random() * 1000);
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    reset({
      fullName: `Test Contact ${randomSuffix}`,
      professionalRoleId: randomRole?.id,
      email: { email: `test-${randomSuffix}@example.com`, label: 'Work' },
      phoneNumber: {
        number: `(555) 000-${randomSuffix.toString().padStart(4, '0')}`,
        label: 'Office',
      },
      tags: ['Test', 'Random'],
    } satisfies Partial<ContactFormValues>);
    toast.info('Form filled with test data.');
  };

  return (
    <>
      <form onSubmit={handleSubmit(saveContact)} className="container-fluid py-7.5">
        <ContactFormToolbar
          isEdit={isEdit}
          isSubmitting={isSubmitting}
          onFillRandom={handleFillRandom}
        />

        <FormSectionNav
          sections={CONTACT_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="space-y-6 pt-6">
          <ContactInfoFormSection
            control={control}
            formState={formState}
            roles={roles}
            isLoadingRoles={false}
          />
          <ContactAssociationSection
            associations={associations}
            vendorOptions={vendorOptions}
            gcOptions={gcOptions}
          />
        </div>
      </form>

      <ContactFormDialogs
        associations={associations}
        vendorOptions={vendorOptions}
        gcOptions={gcOptions}
      />
    </>
  );
}
