import { describe, expect, test } from 'bun:test';

import type { EmailListItem } from '../src/modules/email/components/email-row-card';
import { groupEmailsByMonth } from '../src/modules/email/lib/email-month-groups';

// Every time here is a wall-clock time in the suite's zone (New York, see
// tests/setup-time-zone.ts), which is the viewer's zone for these labels.
const NOW = new Date('2026-07-25T12:00:00-04:00');

function createEmail(id: string, receivedAt: string): EmailListItem {
  return {
    id,
    senderName: `Sender ${id}`,
    senderEmail: `${id}@example.com`,
    subject: `Subject ${id}`,
    preview: `Preview ${id}`,
    receivedAt,
    folder: 'inbox',
    mailbox: 'account',
    unread: false,
  };
}

describe('email month groups', () => {
  test('uses relative labels for today, this week, this month, and last month', () => {
    const groups = groupEmailsByMonth(
      [
        createEmail('today', '2026-07-25T08:00:00-04:00'),
        createEmail('this-week', '2026-07-22T10:00:00-04:00'),
        createEmail('this-month', '2026-07-04T10:00:00-04:00'),
        createEmail('june', '2026-06-30T10:00:00-04:00'),
      ],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual([
      'Today',
      'This week',
      'This month',
      'Last month',
    ]);
  });

  test('keeps the current week together across a month boundary', () => {
    const groups = groupEmailsByMonth(
      [
        createEmail('today', '2026-08-02T08:00:00-04:00'),
        createEmail('this-week', '2026-07-31T10:00:00-04:00'),
        createEmail('last-month', '2026-07-15T10:00:00-04:00'),
      ],
      new Date('2026-08-02T12:00:00-04:00')
    );

    expect(groups.map((group) => group.label)).toEqual(['Today', 'This week', 'Last month']);
  });

  test('handles the previous month across a year boundary', () => {
    const groups = groupEmailsByMonth(
      [createEmail('december', '2025-12-15T10:00:00-05:00')],
      new Date('2026-01-10T12:00:00-05:00')
    );

    expect(groups[0]?.label).toBe('Last month');
  });

  test('sorts calendar months newest first while preserving email order inside each month', () => {
    const groups = groupEmailsByMonth(
      [
        createEmail('may-first', '2026-05-20T10:00:00-04:00'),
        createEmail('march', '2026-03-20T10:00:00-04:00'),
        createEmail('may-second', '2026-05-01T10:00:00-04:00'),
      ],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual(['May 2026', 'March 2026']);
    expect(groups[0]?.emails.map((email) => email.id)).toEqual(['may-first', 'may-second']);
  });

  test('keeps invalid provider dates in a final fallback group', () => {
    const groups = groupEmailsByMonth(
      [createEmail('invalid', 'not-a-date'), createEmail('july', '2026-07-04T10:00:00-04:00')],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual(['This month', 'Unknown date']);
  });
});

/**
 * elli-ui#1034: a pinned thread is one somebody decided to keep in front of
 * them. Leaving it in its date group means it sinks with everything else,
 * which is the thing the pin was meant to prevent.
 */
describe('pinned threads', () => {
  const pinned = (id: string, receivedAt: string, pinnedAt: string): EmailListItem => ({
    ...createEmail(id, receivedAt),
    classification: {
      conversationKey: id,
      status: 'open',
      pinnedAt,
      references: [],
    },
  });

  test('lifts pinned mail into a group of its own, above the dated ones', () => {
    const groups = groupEmailsByMonth(
      [
        createEmail('today', '2026-07-25T08:00:00-04:00'),
        pinned('old', '2026-02-02T10:00:00-05:00', '2026-07-20T10:00:00Z'),
      ],
      NOW
    );

    expect(groups[0]?.label).toBe('Pinned');
    expect(groups[0]?.emails.map((email) => email.id)).toEqual(['old']);
  });

  test('a pinned thread does not also appear under its date', () => {
    // The regression this guards: the same conversation twice in one list,
    // with two checkboxes and two selected states.
    const groups = groupEmailsByMonth(
      [pinned('old', '2026-02-02T10:00:00-05:00', '2026-07-20T10:00:00Z')],
      NOW
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe('pinned');
  });

  test('keeps the order it was given — the API sorts by pin time, not by date', () => {
    const groups = groupEmailsByMonth(
      [
        pinned('pinned-recently', '2026-01-01T10:00:00-05:00', '2026-07-24T10:00:00Z'),
        pinned('pinned-long-ago', '2026-07-24T10:00:00-04:00', '2026-03-01T10:00:00Z'),
      ],
      NOW
    );

    expect(groups[0]?.emails.map((email) => email.id)).toEqual([
      'pinned-recently',
      'pinned-long-ago',
    ]);
  });

  test('no pinned group at all when nothing is pinned', () => {
    // An empty "Pinned" heading over nothing is a row of furniture in a list
    // that is meant to be scanned.
    const groups = groupEmailsByMonth([createEmail('today', '2026-07-25T08:00:00-04:00')], NOW);

    expect(groups.some((group) => group.key === 'pinned')).toBe(false);
  });

  test('a classification with no pin is not pinned', () => {
    const classified: EmailListItem = {
      ...createEmail('classified', '2026-07-25T08:00:00-04:00'),
      classification: { conversationKey: 'c', status: 'open', pinnedAt: null, references: [] },
    };

    expect(groupEmailsByMonth([classified], NOW)[0]?.label).toBe('Today');
  });
});
