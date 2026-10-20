import { describe, expect, test } from 'bun:test';

import type { EmailListItem } from '../src/modules/email/components/email-row-card';
import {
  formatOpenedAgo,
  isEmailActioned,
  markEmailHandled,
  nextUnactionedDeadline,
  pruneUnactionedEmails,
  recordEmailOpened,
  selectUnactionedEmails,
  UNACTIONED_EMAIL_DELAY_MS,
  unactionedEmailKey,
  type UnactionedEmailStore,
} from '../src/modules/email/lib/email-unactioned';

/**
 * elli-ui#1378 — Inbox mail opened and left without an action is flagged once
 * it has waited `UNACTIONED_EMAIL_DELAY_MS`.
 */

const ACCOUNT = 'acc-1';
const MINUTE = 60_000;
const T0 = Date.UTC(2026, 9, 12, 14, 0, 0);

function row(id: string, overrides: Partial<EmailListItem> = {}): EmailListItem {
  return {
    id,
    conversationKey: `conv-${id}`,
    senderName: 'Pat Vendor',
    senderEmail: 'pat@vendor.test',
    subject: `Subject ${id}`,
    preview: '',
    receivedAt: new Date(T0).toISOString(),
    folder: 'inbox-folder-id',
    folderKey: 'inbox',
    mailbox: ACCOUNT,
    unread: false,
    classification: {
      conversationKey: `conv-${id}`,
      status: 'unset',
      assignedTo: null,
      references: [],
    },
    ...overrides,
  };
}

function openedAt(email: EmailListItem, at: number): UnactionedEmailStore {
  return recordEmailOpened({}, unactionedEmailKey(ACCOUNT, email), at);
}

describe('which opened Inbox threads are flagged', () => {
  test('flags a thread opened past the delay with nothing done to it', () => {
    const email = row('a');
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [email],
      store: openedAt(email, T0),
      now: T0 + UNACTIONED_EMAIL_DELAY_MS,
    });
    expect(items.map((item) => item.email.id)).toEqual(['a']);
  });

  test('waits the whole delay — a moment short is not yet flagged', () => {
    const email = row('a');
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [email],
      store: openedAt(email, T0),
      now: T0 + UNACTIONED_EMAIL_DELAY_MS - 1,
    });
    expect(items).toEqual([]);
  });

  test('never flags a thread that was not opened', () => {
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [row('a')],
      store: {},
      now: T0 + 60 * MINUTE,
    });
    expect(items).toEqual([]);
  });

  test('opening it again does not clear it — the open thread stays flagged', () => {
    const email = row('a');
    const key = unactionedEmailKey(ACCOUNT, email);
    // Reopened half an hour later, from the warning or the list.
    const store = recordEmailOpened(openedAt(email, T0), key, T0 + 30 * MINUTE);
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [email],
      store,
      now: T0 + 30 * MINUTE,
    });
    expect(items.map((item) => item.email.id)).toEqual(['a']);
  });

  test('new mail landing in it does not clear it', () => {
    const email = row('a', { unread: true });
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [email],
      store: openedAt(email, T0),
      now: T0 + 60 * MINUTE,
    });
    expect(items.map((item) => item.email.id)).toEqual(['a']);
  });

  test('a reply, forward or meeting response clears it', () => {
    const email = row('a');
    const key = unactionedEmailKey(ACCOUNT, email);
    const store = markEmailHandled(openedAt(email, T0), key, T0 + MINUTE);
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [email],
      store,
      now: T0 + 60 * MINUTE,
    });
    expect(items).toEqual([]);
  });

  test('the same conversation in another mailbox is a separate thread', () => {
    const email = row('a');
    const items = selectUnactionedEmails({
      accountId: 'acc-2',
      emails: [email],
      store: openedAt(email, T0),
      now: T0 + 60 * MINUTE,
    });
    expect(items).toEqual([]);
  });

  test('lists the oldest open first', () => {
    const first = row('first');
    const second = row('second');
    const store = {
      ...openedAt(second, T0 + MINUTE),
      ...openedAt(first, T0),
    };
    const items = selectUnactionedEmails({
      accountId: ACCOUNT,
      emails: [second, first],
      store,
      now: T0 + 60 * MINUTE,
    });
    expect(items.map((item) => item.email.id)).toEqual(['first', 'second']);
  });
});

describe('what counts as acting on a thread', () => {
  const classification = row('x').classification!;

  test.each([
    ['a status', { classification: { ...classification, status: 'open_our_court' as const } }],
    [
      'an assignee',
      {
        classification: {
          ...classification,
          assignedTo: { id: 'u1', name: 'Sam', email: 'sam@elli.test' },
        },
      },
    ],
    [
      'a linked record',
      {
        classification: {
          ...classification,
          references: [{ type: 'project' as const, label: 'P-100' }],
        },
      },
    ],
    ['a pin', { classification: { ...classification, pinnedAt: new Date(T0).toISOString() } }],
    ['a flag', { flagged: true }],
    ['an Elli tag', { tags: ['Follow up'] }],
  ])('%s', (_label, overrides) => {
    expect(isEmailActioned(row('x', overrides as Partial<EmailListItem>))).toBe(true);
  });

  test('a row with no classification yet is not acted on', () => {
    expect(isEmailActioned(row('x', { classification: undefined }))).toBe(false);
  });

  test('reading it is not acting on it, and neither is its read state', () => {
    expect(isEmailActioned(row('x', { unread: false }))).toBe(false);
    expect(isEmailActioned(row('x', { unread: true }))).toBe(false);
  });
});

describe('the open record', () => {
  test('a second open keeps the first open time', () => {
    const email = row('a');
    const key = unactionedEmailKey(ACCOUNT, email);
    const store = recordEmailOpened(openedAt(email, T0), key, T0 + 30 * MINUTE);
    expect(store[key]?.openedAt).toBe(T0);
  });

  test('handling a thread twice keeps the first time', () => {
    const email = row('a');
    const key = unactionedEmailKey(ACCOUNT, email);
    const once = markEmailHandled(openedAt(email, T0), key, T0 + MINUTE);
    expect(markEmailHandled(once, key, T0 + 2 * MINUTE)).toBe(once);
  });

  test('forgets opens past the retention window, keeps recent ones', () => {
    const store: UnactionedEmailStore = {
      old: { openedAt: T0 },
      recent: { openedAt: T0 + 20 * 24 * 60 * MINUTE },
    };
    const pruned = pruneUnactionedEmails(store, T0 + 21 * 24 * 60 * MINUTE);
    expect(Object.keys(pruned)).toEqual(['recent']);
  });
});

describe('the next re-check', () => {
  test('is the moment the earliest waiting thread crosses the delay', () => {
    const early = row('early');
    const late = row('late');
    const store = { ...openedAt(early, T0), ...openedAt(late, T0 + MINUTE) };
    expect(
      nextUnactionedDeadline({
        accountId: ACCOUNT,
        emails: [late, early],
        store,
        now: T0 + 1000,
      })
    ).toBe(T0 + UNACTIONED_EMAIL_DELAY_MS);
  });

  test('is none when every opened thread is already flagged or handled', () => {
    const email = row('a');
    expect(
      nextUnactionedDeadline({
        accountId: ACCOUNT,
        emails: [email],
        store: openedAt(email, T0),
        now: T0 + UNACTIONED_EMAIL_DELAY_MS,
      })
    ).toBeNull();
  });
});

describe('the "opened … ago" label', () => {
  test.each([
    [30 * 1000, 'just now'],
    [6 * MINUTE, '6 min ago'],
    [125 * MINUTE, '2 hr ago'],
    [24 * 60 * MINUTE, '1 day ago'],
    [3 * 24 * 60 * MINUTE, '3 days ago'],
  ])('%p ms reads %p', (elapsed, label) => {
    expect(formatOpenedAgo(T0, T0 + elapsed)).toBe(label);
  });
});
