import { describe, expect, test } from 'bun:test';

import {
  contactEmailInputSchema,
  contactFormSchema,
  contactPaginatedResponseSchema,
} from '../src/modules/directory/schemas/contact.schema';

/**
 * Two contacts the legacy import brought in had malformed addresses —
 * `alexiam2technico-csi.com` (the @ typed as a 2) and `amo@dematteisorg, com`.
 * The list schema checked the format, so those two rows rejected the whole
 * response and the Contacts page showed "Failed to load contacts" for everyone.
 * Reading takes what is stored; entering an address still checks it.
 */

const pagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 3,
  itemsPerPage: 10,
};

const contact = (id: string, email: string) => ({
  id,
  fullName: `Contact ${id}`,
  professionalRoleId: null,
  email,
  phoneNumber: null,
});

describe('the contact list', () => {
  test('loads when a stored address is malformed', () => {
    const result = contactPaginatedResponseSchema.safeParse({
      data: [
        contact('c1', 'alexiam2technico-csi.com'),
        contact('c2', 'amo@dematteisorg, com'),
        contact('c3', 'ann@ellicorp.com'),
      ],
      pagination,
    });

    expect(result.success).toBe(true);
    expect(result.data?.data.map((row) => row.email[0]?.email)).toEqual([
      'alexiam2technico-csi.com',
      'amo@dematteisorg, com',
      'ann@ellicorp.com',
    ]);
  });
});

describe('an email being entered', () => {
  test('is still checked, in the method editor and the contact form', () => {
    expect(
      contactEmailInputSchema.safeParse({ email: 'alexiam2technico-csi.com', label: 'Work' })
        .success
    ).toBe(false);
    expect(
      contactEmailInputSchema.safeParse({ email: 'alexiam@technico-csi.com', label: 'Work' })
        .success
    ).toBe(true);

    const form = contactFormSchema.safeParse({
      fullName: 'Alyson OConnell',
      email: { email: 'amo@dematteisorg, com', label: 'Work' },
    });
    expect(form.success).toBe(false);
    expect(form.error?.issues[0]?.path).toEqual(['email', 'email']);
  });
});
