import { describe, expect, test } from 'bun:test';

import type { EmailListItem } from '../src/modules/email/components/email-row-card';
import { groupEmailsByMonth } from '../src/modules/email/lib/email-month-groups';

const NOW = new Date('2026-07-25T12:00:00+05:30');

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
        createEmail('today', '2026-07-25T08:00:00+05:30'),
        createEmail('this-week', '2026-07-22T10:00:00+05:30'),
        createEmail('this-month', '2026-07-04T10:00:00+05:30'),
        createEmail('june', '2026-06-30T10:00:00+05:30'),
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
        createEmail('today', '2026-08-02T08:00:00+05:30'),
        createEmail('this-week', '2026-07-31T10:00:00+05:30'),
        createEmail('last-month', '2026-07-15T10:00:00+05:30'),
      ],
      new Date('2026-08-02T12:00:00+05:30')
    );

    expect(groups.map((group) => group.label)).toEqual(['Today', 'This week', 'Last month']);
  });

  test('handles the previous month across a year boundary', () => {
    const groups = groupEmailsByMonth(
      [createEmail('december', '2025-12-15T10:00:00+05:30')],
      new Date('2026-01-10T12:00:00+05:30')
    );

    expect(groups[0]?.label).toBe('Last month');
  });

  test('sorts calendar months newest first while preserving email order inside each month', () => {
    const groups = groupEmailsByMonth(
      [
        createEmail('may-first', '2026-05-20T10:00:00+05:30'),
        createEmail('march', '2026-03-20T10:00:00+05:30'),
        createEmail('may-second', '2026-05-01T10:00:00+05:30'),
      ],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual(['May 2026', 'March 2026']);
    expect(groups[0]?.emails.map((email) => email.id)).toEqual(['may-first', 'may-second']);
  });

  test('keeps invalid provider dates in a final fallback group', () => {
    const groups = groupEmailsByMonth(
      [createEmail('invalid', 'not-a-date'), createEmail('july', '2026-07-04T10:00:00+05:30')],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual(['This month', 'Unknown date']);
  });
});
