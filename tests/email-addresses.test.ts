import { describe, expect, test } from 'bun:test';

import {
  getEmailAddressListError,
  parseEmailAddresses,
} from '../src/modules/email/lib/email-addresses';

describe('email address lists', () => {
  test('parses plain and named recipients separated by commas or semicolons', () => {
    expect(
      parseEmailAddresses(
        'client@example.com; Project Manager <manager@example.com>, "Accounts" <ap@example.com>'
      )
    ).toEqual([
      { address: 'client@example.com' },
      { address: 'manager@example.com', name: 'Project Manager' },
      { address: 'ap@example.com', name: 'Accounts' },
    ]);
  });

  test('allows an empty optional draft field', () => {
    expect(getEmailAddressListError('', 'Cc')).toBeNull();
  });

  test('reports incomplete recipients only when the user tries to continue', () => {
    expect(getEmailAddressListError('someone@outlook', 'To', true)).toBe(
      'Finish or remove “someone@outlook” before continuing.'
    );
  });

  test('requires a recipient when sending', () => {
    expect(getEmailAddressListError('', 'To', true)).toBe('Add at least one recipient.');
  });
});
