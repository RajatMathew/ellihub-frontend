import { describe, expect, test } from 'bun:test';

import { parseStickyMessageHeader } from '../src/modules/email/lib/email-sticky-header';

// elli-ui#1298: the pinned message header (elli-ui#1184) can be turned off in
// the display settings. Readers who never touch the setting keep it pinned.

describe('the stored sticky header setting', () => {
  test('keeps the header pinned for a reader who never set it', () => {
    expect(parseStickyMessageHeader(null)).toBe(true);
  });

  test('lets the header scroll away once turned off', () => {
    expect(parseStickyMessageHeader('false')).toBe(false);
  });

  test('keeps it pinned when the stored value is anything else', () => {
    expect(parseStickyMessageHeader('true')).toBe(true);
    expect(parseStickyMessageHeader('garbage')).toBe(true);
  });
});
