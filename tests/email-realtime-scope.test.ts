import { describe, expect, test } from 'bun:test';

import {
  decideEmailRealtimeScope,
  DEFAULT_EMAIL_NOTIFICATION_SCOPE,
} from '../src/modules/email/lib/email-realtime-scope';

/** The admin's four mailboxes and the PM's one, as in elli-ui#918. */
const ADMIN_MAILBOX = 'acct-rajatmathew10';
const PM_MAILBOX = 'acct-sharuntest0';

describe('decideEmailRealtimeScope', () => {
  test('drops an event for a mailbox belonging to another user', () => {
    // The PM's session is handed the admin's mailbox event by the org-wide
    // fan-out. Nothing may happen: no toast, and no cache write either.
    const decision = decideEmailRealtimeScope({
      eventAccountId: ADMIN_MAILBOX,
      knownAccountIds: [PM_MAILBOX],
      activeAccountId: PM_MAILBOX,
    });

    expect(decision.allowNotification).toBe(false);
    expect(decision.allowCacheWrite).toBe(false);
    expect(decision.reason).toBe('unknown-account');
  });

  test('flags an unentitled event as a server scoping fault so it is loggable', () => {
    const decision = decideEmailRealtimeScope({
      eventAccountId: ADMIN_MAILBOX,
      knownAccountIds: [PM_MAILBOX],
      activeAccountId: PM_MAILBOX,
    });

    expect(decision.isScopeViolation).toBe(true);
  });

  test('notifies for the mailbox that is open', () => {
    const decision = decideEmailRealtimeScope({
      eventAccountId: PM_MAILBOX,
      knownAccountIds: [PM_MAILBOX],
      activeAccountId: PM_MAILBOX,
    });

    expect(decision).toEqual({
      allowCacheWrite: true,
      allowNotification: true,
      reason: 'entitled',
      isScopeViolation: false,
    });
  });

  test("notifies for this user's other connected mailbox by default", () => {
    // Several personal accounts connected to one profile: mail in the one you
    // are not looking at is still your mail, and still worth a notification.
    const decision = decideEmailRealtimeScope({
      eventAccountId: 'acct-second-personal',
      knownAccountIds: [PM_MAILBOX, 'acct-second-personal'],
      activeAccountId: PM_MAILBOX,
      scope: DEFAULT_EMAIL_NOTIFICATION_SCOPE,
    });

    expect(decision.allowNotification).toBe(true);
    expect(decision.allowCacheWrite).toBe(true);
  });

  test("the strict scope keeps the other mailbox's cache fresh but stays silent", () => {
    const decision = decideEmailRealtimeScope({
      eventAccountId: 'acct-second-personal',
      knownAccountIds: [PM_MAILBOX, 'acct-second-personal'],
      activeAccountId: PM_MAILBOX,
      scope: 'active-account',
    });

    expect(decision.allowNotification).toBe(false);
    expect(decision.allowCacheWrite).toBe(true);
    expect(decision.reason).toBe('inactive-account');
    expect(decision.isScopeViolation).toBe(false);
  });

  test('an empty accounts list only lets the open mailbox through', () => {
    // Accounts not loaded yet, or garbage collected: entitlement is unknown, so
    // only the mailbox the page already resolved for this user is accepted.
    expect(
      decideEmailRealtimeScope({
        eventAccountId: PM_MAILBOX,
        knownAccountIds: [],
        activeAccountId: PM_MAILBOX,
      })
    ).toMatchObject({ allowCacheWrite: true, allowNotification: true, reason: 'entitled' });

    expect(
      decideEmailRealtimeScope({
        eventAccountId: ADMIN_MAILBOX,
        knownAccountIds: [],
        activeAccountId: PM_MAILBOX,
      })
    ).toMatchObject({
      allowCacheWrite: false,
      allowNotification: false,
      reason: 'unverifiable-account',
      // Unproven, not proven wrong — not something to blame the server for.
      isScopeViolation: false,
    });
  });

  test('drops an event with no mailbox at all', () => {
    const decision = decideEmailRealtimeScope({
      eventAccountId: '',
      knownAccountIds: [PM_MAILBOX],
      activeAccountId: PM_MAILBOX,
    });

    expect(decision.allowCacheWrite).toBe(false);
    expect(decision.allowNotification).toBe(false);
  });

  test('no mailbox open: entitlement alone still decides', () => {
    expect(
      decideEmailRealtimeScope({
        eventAccountId: PM_MAILBOX,
        knownAccountIds: [PM_MAILBOX],
        activeAccountId: null,
      })
    ).toMatchObject({ allowCacheWrite: true, allowNotification: true });

    expect(
      decideEmailRealtimeScope({
        eventAccountId: ADMIN_MAILBOX,
        knownAccountIds: [PM_MAILBOX],
        activeAccountId: null,
      })
    ).toMatchObject({ allowCacheWrite: false, allowNotification: false });
  });
});
