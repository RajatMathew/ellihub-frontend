import { describe, expect, test } from 'bun:test';

import {
  getLinkedContactName,
  withEditedContactNames,
} from '../src/modules/directory/components/shared/linked-contact-utils';
import {
  toQuickContactFormValues,
  toQuickContactUpdateInput,
} from '../src/modules/directory/lib/contact-payload';
import type { Contact } from '../src/modules/directory/schemas/contact.schema';

/**
 * Editing a contact from the vendor and GC forms. `PUT /contact` replaces the
 * whole profile, so a field the request leaves out is cleared on the server.
 */

const contact = {
  id: 'contact-1',
  fullName: 'CID Moosa',
  professionalRoleId: 'role-pm',
  professionalRole: { id: 'role-pm', name: 'PROJECT_MANAGER', label: 'Project Manager' },
  email: [{ email: 'moosa@example.com', label: 'Email' }],
  phoneNumber: [{ number: '(555) 010-2030', label: 'Phone' }],
  tags: ['estimating', 'priority'],
  isPrimary: true,
  vendorId: 'vendor-1',
  generalContractorId: null,
  vendorLinks: [],
  gcLinks: [],
} as unknown as Contact;

describe('the quick contact edit', () => {
  test('opens filled with the contact as saved', () => {
    expect(toQuickContactFormValues(contact)).toEqual({
      fullName: 'CID Moosa',
      professionalRoleId: 'role-pm',
      professionalRoleLabel: '',
      email: 'moosa@example.com',
      phone: '(555) 010-2030',
    });
  });

  test('opens empty where the contact has nothing saved', () => {
    const bare = { ...contact, professionalRoleId: null, email: [], phoneNumber: [] } as Contact;

    expect(toQuickContactFormValues(bare)).toMatchObject({
      professionalRoleId: undefined,
      email: '',
      phone: '',
    });
  });

  test('keeps the tags the dialog does not show, rather than clearing them', () => {
    const input = toQuickContactUpdateInput(toQuickContactFormValues(contact), contact);

    expect(input.tags).toEqual(['estimating', 'priority']);
  });

  test('sends the edited profile', () => {
    const input = toQuickContactUpdateInput(
      {
        ...toQuickContactFormValues(contact),
        fullName: 'CID Moosa Jr',
        email: ' moosa.jr@example.com ',
      },
      contact
    );

    expect(input).toMatchObject({
      fullName: 'CID Moosa Jr',
      professionalRoleId: 'role-pm',
      email: 'moosa.jr@example.com',
      phoneNumber: '(555) 010-2030',
    });
  });

  test('clears what was emptied: a removed role is sent as null, a removed email left out', () => {
    const input = toQuickContactUpdateInput(
      { ...toQuickContactFormValues(contact), professionalRoleId: undefined, email: '' },
      contact
    );

    expect(input.professionalRoleId).toBeNull();
    expect(input.email).toBeUndefined();
  });

  test('sends a typed role instead of the picked one, never both', () => {
    const input = toQuickContactUpdateInput(
      { ...toQuickContactFormValues(contact), professionalRoleLabel: ' Site Lead ' },
      contact
    );

    expect(input.professionalRoleLabel).toBe('Site Lead');
    expect(input.professionalRoleId).toBeUndefined();
  });

  test('leaves the vendor or GC link and Primary to the form that owns them', () => {
    const input = toQuickContactUpdateInput(toQuickContactFormValues(contact), contact);

    expect(Object.keys(input)).not.toContain('vendorId');
    expect(Object.keys(input)).not.toContain('generalContractorId');
    expect(Object.keys(input)).not.toContain('isPrimary');
  });
});

describe('a linked contact row after its contact is edited', () => {
  const savedLink = { contactId: 'contact-1', contact: { fullName: 'CID Moosa' } };
  const picked = {
    id: 'contact-1',
    fullName: 'CID Moosa',
    vendorId: 'vendor-2',
    vendor: { id: 'vendor-2', name: 'Other Vendor' },
  };

  test('shows the edited name, not the one the vendor was loaded with', () => {
    const contacts = withEditedContactNames([picked], { 'contact-1': 'CID Moosa Jr' });

    expect(getLinkedContactName('contact-1', contacts, [savedLink], [])).toBe('CID Moosa Jr');
  });

  test('keeps the rest of the contact, which decides whether linking it replaces a link', () => {
    const [edited] = withEditedContactNames([picked], { 'contact-1': 'CID Moosa Jr' });

    expect(edited).toEqual({ ...picked, fullName: 'CID Moosa Jr' });
  });

  test('falls back to the saved link while the form has no other source', () => {
    expect(getLinkedContactName('contact-1', [], [savedLink], [])).toBe('CID Moosa');
  });
});
