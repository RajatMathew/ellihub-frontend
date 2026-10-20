import { describe, expect, test } from 'bun:test';

import { quickCreateContactSchema } from '../src/modules/directory/schemas/contact.schema';

/**
 * The quick contact dialog's name rule. elli-core refuses a full name shorter
 * than two characters on create and on update; the dialog let one through, so
 * the mistake only surfaced as a failed request after Save.
 */

const values = (fullName: string) => ({ fullName, email: 'moosa@example.com', phone: '' });

describe('the quick contact name', () => {
  test('needs at least two characters, as the API does', () => {
    const result = quickCreateContactSchema.safeParse(values('M'));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['fullName']);
  });

  test('does not count surrounding spaces', () => {
    expect(quickCreateContactSchema.safeParse(values(' M ')).success).toBe(false);
  });

  test('accepts a real name, trimmed', () => {
    const result = quickCreateContactSchema.safeParse(values('  CID Moosa '));

    expect(result.success).toBe(true);
    expect(result.data?.fullName).toBe('CID Moosa');
  });
});
