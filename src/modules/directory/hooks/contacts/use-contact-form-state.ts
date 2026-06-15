import { useEffect } from 'react';

import { getContactFormDefaults } from '@/modules/directory/components/contacts/form/contact-form-utils';
import { useContactForm } from '@/modules/directory/hooks/contacts.hooks';
import type {
  Contact,
  ContactFormValues,
  ProfessionalRole,
} from '@/modules/directory/schemas/contact.schema';

interface UseContactFormStateArgs {
  contact: Contact | undefined;
  isEdit: boolean;
  roles: ProfessionalRole[];
}

export function useContactFormState({ contact, isEdit, roles }: UseContactFormStateArgs) {
  const form = useContactForm(getContactFormDefaults(isEdit ? contact : undefined));
  const { reset } = form;

  useEffect(() => {
    if (!isEdit || !contact) return;
    reset(getContactFormDefaults(contact) as Partial<ContactFormValues>);
  }, [isEdit, contact, roles, reset]);

  return form;
}
