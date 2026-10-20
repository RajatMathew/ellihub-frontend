import { describe, expect, test } from 'bun:test';

import type { CalendarEventEmailLink } from '../src/modules/email/api';
import { serializeEventDate } from '../src/modules/email/lib/calendar-event-form';
import {
  isThreadEventPast,
  orderThreadEvents,
  stripReplyPrefixes,
  threadEventDateParts,
  threadEventPrefill,
  threadEventWhenLabel,
  writableCalendarOptions,
} from '../src/modules/email/lib/thread-calendar-events';

// "Calendar events" on a mail thread (elli-ui#1305): what a new event starts
// from, how linked ones are labelled and ordered, and where one can go. The
// suite runs on a New York clock (tests/setup-time-zone.ts), where an all-day
// date read as UTC shows the day before.

const NOW = new Date(2026, 9, 8, 12, 0); // Oct 8 2026, noon local

const link = (overrides: Partial<CalendarEventEmailLink> = {}): CalendarEventEmailLink => ({
  id: 'link-1',
  calendarId: 'cal-1',
  eventId: 'event-1',
  eventSubject: 'Plywood delivery',
  eventStart: '2026-10-14',
  eventEnd: '2026-10-15',
  eventIsAllDay: true,
  accountId: 'acct-1',
  providerId: 'msg-1',
  conversationKey: 'conv-1',
  threadId: null,
  subject: 'Delivery date',
  fromEmail: 'vendor@example.com',
  createdAt: '2026-10-08T00:00:00.000Z',
  ...overrides,
});

describe('a new event from a thread', () => {
  test('takes the subject without its reply and forward prefixes', () => {
    expect(stripReplyPrefixes('RE: FW: Re:  Plywood delivery')).toBe('Plywood delivery');
    expect(stripReplyPrefixes('Retaining wall')).toBe('Retaining wall');
  });

  test('is all day and says who the email was from', () => {
    const prefill = threadEventPrefill({
      subject: 'RE: Plywood delivery',
      senderName: 'Atlantic Plywood',
      senderEmail: 'orders@atlantic.example',
    });

    expect(prefill).toEqual({
      subject: 'Plywood delivery',
      description:
        'From an email by Atlantic Plywood <orders@atlantic.example>: "Plywood delivery"',
      allDay: true,
    });
  });

  test('has no notes when the sender is unknown, rather than a dangling "From"', () => {
    expect(threadEventPrefill({ subject: 'Hello' }).description).toBe('');
  });

  test('sends an all-day date as that local day, not the UTC one', () => {
    // 9 pm on the 14th in New York is already the 15th in UTC.
    expect(serializeEventDate(new Date(2026, 9, 14, 21, 0), true)).toBe('2026-10-14T00:00:00.000Z');
  });
});

describe('a linked event in the list', () => {
  test('an all-day one reads as its own day, in New York too', () => {
    expect(threadEventWhenLabel(link(), NOW)).toBe('Wed, Oct 14');
    // Stored as UTC midnight, which in New York is 8 pm the day before.
    expect(threadEventWhenLabel(link({ eventStart: '2026-10-14T00:00:00.000Z' }), NOW)).toBe(
      'Wed, Oct 14'
    );
  });

  test('a timed one carries its time, and a date in another year its year', () => {
    const timed = link({ eventStart: '2027-01-05T14:30:00.000Z', eventIsAllDay: false });

    expect(threadEventWhenLabel(timed, NOW)).toBe('Tue, Jan 5, 2027 · 9:30 AM');
  });

  test('splits into a month-and-day tile and a weekday-and-time line', () => {
    expect(threadEventDateParts(link(), NOW)).toEqual({
      month: 'Oct',
      day: '14',
      detail: 'Wed · All day',
    });
    const timed = link({ eventStart: '2027-01-05T14:30:00.000Z', eventIsAllDay: false });
    expect(threadEventDateParts(timed, NOW)).toEqual({
      month: 'Jan',
      day: '5',
      detail: 'Tue · 9:30 AM · 2027',
    });
    expect(threadEventDateParts(link({ eventStart: null }), NOW)).toBeNull();
  });

  test('one whose date was never copied says so', () => {
    expect(threadEventWhenLabel(link({ eventStart: null }), NOW)).toBe('Date not set');
  });

  test('is past once its last day is over, and not before', () => {
    expect(isThreadEventPast(link({ eventStart: '2026-10-07', eventEnd: '2026-10-08' }), NOW)).toBe(
      true
    );
    expect(isThreadEventPast(link({ eventStart: '2026-10-08', eventEnd: '2026-10-09' }), NOW)).toBe(
      false
    );
  });

  test('comes soonest first, with the past ones after the ones to come', () => {
    const ordered = orderThreadEvents(
      [
        link({ id: 'later', eventStart: '2026-10-20', eventEnd: '2026-10-21' }),
        link({ id: 'past', eventStart: '2026-10-01', eventEnd: '2026-10-02' }),
        link({ id: 'soon', eventStart: '2026-10-10', eventEnd: '2026-10-11' }),
      ],
      NOW
    );

    expect(ordered.map((item) => item.id)).toEqual(['soon', 'later', 'past']);
  });
});

describe('where an event from a thread can go', () => {
  const calendars = [
    { id: 'mine', name: 'Procurement', isPrimary: true, selected: true, hidden: false },
    { id: 'holidays', name: 'Holidays', readOnly: true, selected: true, hidden: false },
    { id: 'shop:cal', name: 'Shop', selected: false, hidden: false },
  ];

  test('the calendars picked for this mailbox, without the read-only ones', () => {
    const selection = [
      {
        aurinkoCalendarId: 'mine',
        name: 'Procurement',
        color: null,
        isPrimary: true,
        hidden: false,
      },
      {
        aurinkoCalendarId: 'holidays',
        name: 'Holidays',
        color: null,
        isPrimary: false,
        hidden: false,
      },
    ];

    expect(
      writableCalendarOptions(selection, calendars).map((row) => row.aurinkoCalendarId)
    ).toEqual(['mine']);
  });

  test('every writable calendar, for someone who never opened the Calendar tab', () => {
    expect(writableCalendarOptions([], calendars).map((row) => row.aurinkoCalendarId)).toEqual([
      'mine',
      'shop:cal',
    ]);
  });
});
