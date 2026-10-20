import type {
  Contact,
  CreateContactInput,
  QuickCreateContactValues,
  UpdateContactInput,
} from '@/modules/directory/schemas/contact.schema';

interface ContactRoleValues {
  professionalRoleId?: string | null;
  professionalRoleLabel?: string;
}

/**
 * A contact's professional role, as the API takes it: either an existing role
 * or a custom one typed in, never both. A typed role wins over a picked one.
 */
export function getCreateContactRolePayload(
  values: ContactRoleValues
): Pick<CreateContactInput, 'professionalRoleId' | 'professionalRoleLabel'> {
  const professionalRoleLabel = values.professionalRoleLabel?.trim() || undefined;

  if (professionalRoleLabel) {
    return { professionalRoleId: undefined, professionalRoleLabel };
  }

  return {
    professionalRoleId: values.professionalRoleId || undefined,
    professionalRoleLabel: undefined,
  };
}

/** As `getCreateContactRolePayload`, but no role is sent as `null`, which clears it. */
export function getUpdateContactRolePayload(
  values: ContactRoleValues
): Pick<UpdateContactInput, 'professionalRoleId' | 'professionalRoleLabel'> {
  const professionalRoleLabel = values.professionalRoleLabel?.trim() || undefined;

  if (professionalRoleLabel) {
    return { professionalRoleId: undefined, professionalRoleLabel };
  }

  return {
    professionalRoleId: values.professionalRoleId || null,
    professionalRoleLabel: undefined,
  };
}

/** The create request for a contact made in the quick dialog. */
export function toQuickContactCreateInput(values: QuickCreateContactValues): CreateContactInput {
  return {
    fullName: values.fullName,
    ...getCreateContactRolePayload(values),
    email: values.email || undefined,
    phoneNumber: values.phone || undefined,
  };
}

/** The quick dialog's fields, filled from a saved contact. */
export function toQuickContactFormValues(contact: Contact): QuickCreateContactValues {
  return {
    fullName: contact.fullName,
    professionalRoleId: contact.professionalRoleId ?? undefined,
    professionalRoleLabel: '',
    email: contact.email[0]?.email ?? '',
    phone: contact.phoneNumber[0]?.number ?? '',
  };
}

/**
 * The update request for a contact edited in the quick dialog.
 *
 * `PUT /contact` replaces the whole profile — a field left out is cleared — so
 * this carries the contact's tags, which the dialog does not show. It never
 * carries the vendor or GC link, or Primary: left out, the API keeps them, and
 * the vendor and GC forms save those themselves.
 */
export function toQuickContactUpdateInput(
  values: QuickCreateContactValues,
  contact: Pick<Contact, 'tags'>
): UpdateContactInput {
  return {
    fullName: values.fullName,
    ...getUpdateContactRolePayload(values),
    email: values.email?.trim() || undefined,
    phoneNumber: values.phone?.trim() || undefined,
    tags: contact.tags,
  };
}
