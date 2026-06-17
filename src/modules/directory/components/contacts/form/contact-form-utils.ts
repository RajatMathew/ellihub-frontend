import type {
  Contact,
  ContactFormValues,
  ProfessionalRole,
} from '@/modules/directory/schemas/contact.schema';

export function getContactFormDefaults(contact?: Contact): Partial<ContactFormValues> {
  if (!contact) {
    return {
      fullName: '',
      professionalRoleId: undefined,
      email: undefined,
      phoneNumber: undefined,
      tags: [],
    };
  }

  return {
    fullName: contact.fullName,
    professionalRoleId: resolveContactRoleId(contact.professionalRoleId, contact.professionalRole),
    email: contact.email[0],
    phoneNumber: contact.phoneNumber[0],
    tags: contact.tags,
  };
}

export function resolveContactRoleId(
  id: string | null | undefined,
  role?: ProfessionalRole | null
) {
  return id ?? role?.id ?? undefined;
}
