import { describe, expect, test } from 'bun:test';

import {
  commitAddressChips,
  endsWithCompleteAddress,
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

describe('commitAddressChips', () => {
  const INVALID_S = '“s” is not a complete email address. Recipients look like name@company.com.';

  test('refuses to chip a stray word and leaves it in the field to fix', () => {
    // The reported bug: typing "s" and pressing Enter committed a chip anyway.
    expect(commitAddressChips([], 's')).toEqual({
      chips: [],
      buffer: 's',
      error: INVALID_S,
    });
  });

  test('refuses a half-typed address rather than committing it red', () => {
    const result = commitAddressChips(['a@example.com'], 'someone@outlook');

    expect(result.chips).toEqual(['a@example.com']);
    expect(result.buffer).toBe('someone@outlook');
    expect(result.error).not.toBeNull();
  });

  test('commits a complete address and clears the field', () => {
    expect(commitAddressChips([], 'sharuntest0@outlook.com')).toEqual({
      chips: ['sharuntest0@outlook.com'],
      buffer: '',
      error: null,
    });
  });

  test('commits a named address without splitting it on its spaces', () => {
    expect(commitAddressChips([], 'Project Manager <manager@example.com>')).toEqual({
      chips: ['Project Manager <manager@example.com>'],
      buffer: '',
      error: null,
    });
  });

  test('keeps the valid half of a paste and hands the rest back', () => {
    const result = commitAddressChips([], 'a@example.com, nonsense, b@example.com');

    expect(result.chips).toEqual(['a@example.com', 'b@example.com']);
    expect(result.buffer).toBe('nonsense');
    expect(result.error).toBe(
      '“nonsense” is not a complete email address. Recipients look like name@company.com.'
    );
  });

  test('carries the still-being-typed tail back unjudged', () => {
    expect(commitAddressChips([], 'a@example.com', 'b@exa')).toEqual({
      chips: ['a@example.com'],
      buffer: 'b@exa',
      error: null,
    });
  });

  test('puts the refused fragments before the tail the user is still typing', () => {
    expect(commitAddressChips([], 'a@example.com, junk', 'c@exa').buffer).toBe('junk, c@exa');
  });

  test('deduplicates against an existing chip, including its named form', () => {
    const already = ['a@example.com'];

    expect(commitAddressChips(already, 'a@example.com').chips).toBe(already);
    expect(commitAddressChips(already, 'Ada <a@example.com>').chips).toBe(already);
  });

  test('an empty buffer is a no-op, not an error', () => {
    expect(commitAddressChips(['a@example.com'], '   ')).toEqual({
      chips: ['a@example.com'],
      buffer: '',
      error: null,
    });
  });

  test('anything it accepts also passes the send-time gate', () => {
    const committed = ['a@example.com', 'Ada <ada@example.com>', 'b@example.com'].reduce<string[]>(
      (chips, text) => commitAddressChips(chips, text).chips,
      []
    );

    expect(getEmailAddressListError(committed.join(', '), 'To', true)).toBeNull();
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

describe('endsWithCompleteAddress', () => {
  test('a space after a complete address turns it into a chip', () => {
    expect(endsWithCompleteAddress('sdshsg@gmail.com ')).toBe(true);
  });

  test('waits for the space — an address still being typed is not finished', () => {
    expect(endsWithCompleteAddress('sdshsg@gmail.com')).toBe(false);
    expect(endsWithCompleteAddress('sdshsg@gmail ')).toBe(false);
  });

  test('leaves a name alone, since it may be the start of `Name <address>`', () => {
    expect(endsWithCompleteAddress('John ')).toBe(false);
    expect(endsWithCompleteAddress('John Smith <j@x.com> ')).toBe(false);
  });
});
