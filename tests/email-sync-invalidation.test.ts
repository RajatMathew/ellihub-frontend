import { describe, expect, test } from 'bun:test';

import { emailSyncInvalidation } from '../src/modules/email/lib/email-sync-invalidation';

describe('what a finished sync makes stale', () => {
  test('a sync that moved nothing refetches nothing but the account row', () => {
    // Four invalidations fired on every sync, new mail or not — four requests
    // and ~35KB each time a merely stale mailbox was opened, which is most
    // openings of most mailboxes. Measured on a personal account: opening it
    // cost 9 requests, 4 of them this.
    expect(emailSyncInvalidation({ processed: 0 })).toEqual({
      messages: false,
      folders: false,
      tags: false,
      // Still refetched: the account row carries `freshness`, and the list uses
      // it to stop saying the mailbox is catching up.
      accounts: true,
    });
  });

  test('a sync that landed mail refetches everything it touched', () => {
    expect(emailSyncInvalidation({ processed: 1 })).toEqual({
      messages: true,
      folders: true,
      tags: true,
      accounts: true,
    });
  });

  test('scales with nothing but whether anything landed', () => {
    expect(emailSyncInvalidation({ processed: 250 })).toEqual(
      emailSyncInvalidation({ processed: 1 })
    );
  });
});
