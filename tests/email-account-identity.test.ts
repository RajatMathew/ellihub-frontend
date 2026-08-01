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
      ).toBe(`${provider}:person@example.com`);
    }
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
