import { describe, expect, test } from 'bun:test';

import { emailKeys } from '../src/modules/email/constants/email.keys';
import { sharedMailboxChangeKeys } from '../src/modules/settings/constants/shared-mailboxes.keys';

/**
 * Removing a mailbox in Settings must refresh the mail account list
 * (elli-ui#1254).
 *
 * The removals invalidated `['email', 'accounts']`. No query has that key —
 * the account list is `['connected-email', 'accounts']` — so the invalidation
 * matched nothing and the removed mailbox stayed in the account bar until a
 * reload.
 */
describe('what a mailbox change makes stale', () => {
  test.each([
    ['removing a common mailbox', sharedMailboxChangeKeys.mailboxRemoved],
    ['disconnecting or removing a vendor account', sharedMailboxChangeKeys.vendorConnectionRemoved],
    ['adding discovered mailboxes', sharedMailboxChangeKeys.discoveryConfirmed],
  ])('%s refreshes the mail account list', (_change, keys) => {
    expect(keys).toContainEqual(emailKeys.accounts());
  });

  test('names no key outside the mail and settings caches', () => {
    // A key under a root nothing uses invalidates nothing, and fails silently.
    const roots = new Set(
      Object.values(sharedMailboxChangeKeys)
        .flat()
        .map((key) => key[0])
    );

    expect([...roots].sort()).toEqual([emailKeys.all[0], 'settings'].sort());
  });
});
