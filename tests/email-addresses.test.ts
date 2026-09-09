import { describe, expect, test } from 'bun:test';

import {
  formatEmailAddress,
  getEmailAddressListError,
  isValidEmailAddress,
  parseEmailAddresses,
  partitionEmailAddresses,
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

describe('isValidEmailAddress', () => {
  test('accepts a bare address and a named one', () => {
    expect(isValidEmailAddress('sharuntest0@outlook.com')).toBe(true);
    expect(isValidEmailAddress('Sharun <sharuntest0@outlook.com>')).toBe(true);
  });

  test('rejects plain text and half-typed addresses', () => {
    expect(isValidEmailAddress('test')).toBe(false);
    expect(isValidEmailAddress('')).toBe(false);
    expect(isValidEmailAddress('   ')).toBe(false);
    expect(isValidEmailAddress('someone@outlook')).toBe(false);
    expect(isValidEmailAddress('@outlook.com')).toBe(false);
    expect(isValidEmailAddress('someone@')).toBe(false);
  });

  test('rejects a list — one address at a time only', () => {
    expect(isValidEmailAddress('a@example.com, b@example.com')).toBe(false);
  });
});

describe('partitionEmailAddresses', () => {
  test('keeps the complete addresses and hands back the rest', () => {
    expect(
      partitionEmailAddresses('sharuntest0@outlook.com, test; Sharun <s@example.com>')
    ).toEqual({
      valid: ['sharuntest0@outlook.com', 'Sharun <s@example.com>'],
      invalid: ['test'],
    });
  });

  test('splits pasted lists on newlines and spaces', () => {
    expect(partitionEmailAddresses('a@example.com\nb@example.com c@example.com')).toEqual({
      valid: ['a@example.com', 'b@example.com', 'c@example.com'],
      invalid: [],
    });
  });

  test('does not split a named address on its internal spaces', () => {
    expect(partitionEmailAddresses('Project Manager <manager@example.com>')).toEqual({
      valid: ['Project Manager <manager@example.com>'],
      invalid: [],
    });
  });

  test('reports nothing for an empty field', () => {
    expect(partitionEmailAddresses('  ')).toEqual({ valid: [], invalid: [] });
  });
});

describe('formatEmailAddress', () => {
  test('round-trips a parsed address back to its text form', () => {
    expect(formatEmailAddress({ address: 'a@example.com' })).toBe('a@example.com');
    expect(formatEmailAddress({ address: 'a@example.com', name: 'Ada' })).toBe(
      'Ada <a@example.com>'
    );
  });
});
