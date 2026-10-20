import {
  calendarOptionLabel,
  calendarOwnerAddress,
  eventCalendarName,
} from '@/modules/email/lib/email-calendar-owner';
import { describe, expect, test } from 'bun:test';

/**
 * Which mailbox a calendar option belongs to (elli-ui#1241), and what it is
 * called (elli-ui#1395).
 *
 * The picker lists the viewing mailbox's calendars alongside every shared
 * mailbox's. Every default calendar in it is named after its mailbox —
 * `Procurement`, `Elli-Contracts` — never the pronoun "My calendar", which on
 * a shared mailbox was actively misleading. The viewing mailbox's own default
 * calendar also carries its address, so its owner is unmistakable.
 */

describe('the mailbox shown beside a calendar option', () => {
  test('names the mailbox on its own default calendar', () => {
    expect(
      calendarOwnerAddress({ isPrimary: true, name: 'Procurement' }, 'procurement@ellicorp.com')
    ).toBe('procurement@ellicorp.com');
  });

  test('says nothing on a calendar borrowed from another mailbox', () => {
    // elli-core forces `primary: false` on every option it borrows, and those
    // options already carry their mailbox's name.
    expect(calendarOwnerAddress({ isPrimary: false }, 'procurement@ellicorp.com')).toBeNull();
    expect(calendarOwnerAddress({}, 'procurement@ellicorp.com')).toBeNull();
  });

  test('says nothing while the account is still unknown', () => {
    // The accounts query may not have answered yet. Empty brackets would be
    // worse than no brackets.
    expect(calendarOwnerAddress({ isPrimary: true }, null)).toBeNull();
    expect(calendarOwnerAddress({ isPrimary: true }, undefined)).toBeNull();
    expect(calendarOwnerAddress({ isPrimary: true }, '   ')).toBeNull();
  });

  test('does not repeat the address when the calendar is already named by it', () => {
    // A mailbox with no display name has its default calendar named after
    // its address; "x@y (x@y)" would say the same thing twice.
    expect(
      calendarOwnerAddress(
        { isPrimary: true, name: 'Procurement@Ellicorp.com' },
        'procurement@ellicorp.com'
      )
    ).toBeNull();
  });
});

describe('the one-line label', () => {
  test('reads "Procurement (procurement@ellicorp.com)"', () => {
    expect(calendarOptionLabel('Procurement', 'procurement@ellicorp.com')).toBe(
      'Procurement (procurement@ellicorp.com)'
    );
  });

  test('is just the name when there is no mailbox to add', () => {
    expect(calendarOptionLabel('Elli-Contracts', null)).toBe('Elli-Contracts');
  });

  test('works on a calendar the user renamed in Outlook', () => {
    expect(calendarOptionLabel('Site visits', 'procurement@ellicorp.com')).toBe(
      'Site visits (procurement@ellicorp.com)'
    );
  });
});

describe('the calendar an event dialog shows', () => {
  test('is the chosen calendar, by its real name', () => {
    expect(eventCalendarName({ name: 'Procurement' })).toBe('Procurement');
  });

  test('says "Calendar", never "My calendar", when no subscribed calendar matches', () => {
    expect(eventCalendarName(undefined)).toBe('Calendar');
    expect(eventCalendarName(null)).toBe('Calendar');
    expect(eventCalendarName({ name: '' })).toBe('Calendar');
  });
});
