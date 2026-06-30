import type {
  Contact,
  ContactFormValues,
  ProfessionalRole,
} from '@/modules/directory/schemas/contact.schema';

export function getContactFormDefaults(
  contact?: Contact,
  roles: ProfessionalRole[] = []
): Partial<ContactFormValues> {
  if (!contact) {
    return {
      fullName: '',
      professionalRoleId: undefined,
      professionalRoleLabel: '',
      email: undefined,
      phoneNumber: undefined,
      tags: [],
    };
  }

  const resolvedRoleId = resolveContactRoleId(contact.professionalRoleId, contact.professionalRole);
  const hasKnownRole = Boolean(resolvedRoleId && roles.some((role) => role.id === resolvedRoleId));
  const fallbackRoleLabel = contact.professionalRole
    ? contact.professionalRole.label || contact.professionalRole.name || ''
    : '';

  return {
    fullName: contact.fullName,
    professionalRoleId: hasKnownRole ? resolvedRoleId : undefined,
    professionalRoleLabel: hasKnownRole ? '' : fallbackRoleLabel,
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
