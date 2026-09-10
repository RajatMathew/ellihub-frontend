import { describe, expect, test } from 'bun:test';

import {
  canSenderHavePhoto,
  getAccountTenantDomains,
  getEmailAddressDomain,
  normalizeSenderAddress,
} from '../src/modules/email/utils/email-sender-photo';

/**
 * The rule that decides whether SenderAvatar renders its <img> at all. Every
 * `false` here is a request DevTools no longer logs as a 404 (elli-ui#872).
 */
describe('sender photo eligibility', () => {
  const outlook = {
    provider: 'outlook',
    email: 'aaryan@ellicorp.com',
    mailboxAddress: 'aaryan@ellicorp.com',
  };

  test('a colleague in the same tenant is asked for', () => {
    expect(canSenderHavePhoto(outlook, 'someone.else@ellicorp.com')).toBe(true);
  });

  test('external senders are never asked for', () => {
    expect(canSenderHavePhoto(outlook, 'robyn@eagle-aluminum.com')).toBe(false);
    expect(canSenderHavePhoto(outlook, 'juliomora@frigoterm.com.mx')).toBe(false);
    expect(canSenderHavePhoto(outlook, 'someone@mail.ellicorp.com')).toBe(false);
    expect(canSenderHavePhoto(outlook, 'someone@ellicorp.com.evil.net')).toBe(false);
  });

  test('casing and whitespace do not change the answer', () => {
    expect(canSenderHavePhoto(outlook, '  Someone.Else@ElliCorp.COM \n')).toBe(true);
    expect(canSenderHavePhoto(outlook, '\tROBYN@Eagle-Aluminum.com  ')).toBe(false);
    expect(
      canSenderHavePhoto(
        { provider: 'outlook', email: ' AARYAN@ElliCorp.com ', mailboxAddress: null },
        'someone@ellicorp.com'
      )
    ).toBe(true);
  });

  test('a shared mailbox counts its own domain as well as the connecting user', () => {
    // The account row behind an `__elli_shared__:` token: the mailbox it reads
    // as can sit on a different verified domain than the person who connected.
    const shared = {
      provider: 'outlook',
      email: 'aaryan@ellicorp.com',
      mailboxAddress: 'estimating@elli-build.com',
    };
    expect(getAccountTenantDomains(shared)).toEqual(new Set(['elli-build.com', 'ellicorp.com']));
    expect(canSenderHavePhoto(shared, 'someone@elli-build.com')).toBe(true);
    expect(canSenderHavePhoto(shared, 'someone@ellicorp.com')).toBe(true);
    expect(canSenderHavePhoto(shared, 'robyn@eagle-aluminum.com')).toBe(false);
  });

  test('Gmail and Zoho accounts have no photo endpoint at all', () => {
    for (const provider of ['gmail', 'zoho']) {
      expect(
        canSenderHavePhoto(
          { provider, email: 'aaryan@ellicorp.com', mailboxAddress: 'aaryan@ellicorp.com' },
          'someone.else@ellicorp.com'
        )
      ).toBe(false);
    }
  });

  test('a consumer mailbox only asks about itself', () => {
    const personal = { provider: 'outlook', email: 'aaryan.tester@outlook.com' };
    expect(canSenderHavePhoto(personal, 'Aaryan.Tester@Outlook.com')).toBe(true);
    expect(canSenderHavePhoto(personal, 'someone.else@outlook.com')).toBe(false);
    expect(getAccountTenantDomains(personal)).toEqual(new Set());
  });

  test('a missing account or address is refused rather than guessed', () => {
    expect(canSenderHavePhoto(undefined, 'someone@ellicorp.com')).toBe(false);
    expect(canSenderHavePhoto(outlook, undefined)).toBe(false);
    for (const address of ['', '   ', 'no-at-sign', '@ellicorp.com', 'a@b@ellicorp.com']) {
      expect(canSenderHavePhoto(outlook, address)).toBe(false);
    }
  });

  test('normalizes and splits addresses', () => {
    expect(normalizeSenderAddress(' Robyn@Eagle-Aluminum.COM ')).toBe('robyn@eagle-aluminum.com');
    expect(getEmailAddressDomain('Robyn@Eagle-Aluminum.COM')).toBe('eagle-aluminum.com');
    expect(getEmailAddressDomain('robyn@')).toBeNull();
    expect(getEmailAddressDomain('robyn')).toBeNull();
  });
});
