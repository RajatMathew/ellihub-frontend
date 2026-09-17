import { describe, expect, test } from 'bun:test';

import {
  dedupeEmailAccounts,
  getEmailAccountIdentityKey,
} from '../src/modules/email/utils/email-account-identity';

describe('email account identity', () => {
  test('normalizes identities for Gmail, Outlook, and Zoho', () => {
    for (const provider of ['gmail', 'outlook', 'zoho']) {
      expect(
        getEmailAccountIdentityKey({
          provider,
          email: 'fallback@example.com',
          mailboxAddress: ' Person@Example.COM ',
        })
      ).toBe(`personal:${provider}:person@example.com`);
    }
  });

  test('a shared mailbox is not the same account as a personal one at that address', () => {
    // What the `personal:` / `shared:` prefix exists for, and what this file
    // asserted away for as long as it has been failing: the same address
    // reached as your own mailbox and as a shared one is two accounts, and
    // deduping them into one loses whichever the list happens to see second.
    const personal = {
      provider: 'outlook',
      email: 'ops@example.com',
      mailboxAddress: 'ops@example.com',
    };
    const shared = { ...personal, sharedMailboxKey: 'ops-team' };

    expect(getEmailAccountIdentityKey(shared)).not.toBe(getEmailAccountIdentityKey(personal));
    expect(dedupeEmailAccounts([personal, shared])).toHaveLength(2);
  });

  test('two shared mailboxes at one address stay apart by their key', () => {
    const base = {
      provider: 'outlook',
      email: 'ops@example.com',
      mailboxAddress: 'ops@example.com',
    };

    expect(
      dedupeEmailAccounts([
        { ...base, sharedMailboxKey: 'ops-team' },
        { ...base, sharedMailboxKey: 'billing-team' },
        { ...base, sharedMailboxKey: 'ops-team' },
      ])
    ).toHaveLength(2);
  });

  test('keeps a single cached entry after repeated Gmail, Outlook, or Zoho sign-in', () => {
    for (const provider of ['gmail', 'outlook', 'zoho']) {
      const accounts = [
        {
          id: `${provider}-connected`,
          provider,
          email: 'person@example.com',
          mailboxAddress: 'person@example.com',
        },
        {
          id: `${provider}-legacy-duplicate`,
          provider,
          email: 'PERSON@example.com',
          mailboxAddress: ' PERSON@example.com ',
        },
      ];

      expect(dedupeEmailAccounts(accounts).map((account) => account.id)).toEqual([
        `${provider}-connected`,
      ]);
    }
  });
});
