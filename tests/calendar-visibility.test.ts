import { describe, expect, test } from 'bun:test';

import type {
  CalendarEventRecord,
  CalendarSelectionRow,
  CalendarSummary,
} from '../src/modules/email/api';
import {
  withCalendarHidden,
  withoutCalendarEvents,
  withSummaryHidden,
} from '../src/modules/email/lib/calendar-visibility';

/**
 * Unticking a calendar in the picker (elli-ui#1240).
 *
 * The toggle used to roll a failure back by restoring a snapshot of the whole
 * list, and to re-read every calendar from the provider before it let go of the
 * picker. These transforms replace both: they change only the calendar that was
 * clicked, and hiding takes its events out of the window already loaded.
 */

const row = (aurinkoCalendarId: string, hidden = false) =>
  ({ aurinkoCalendarId, name: aurinkoCalendarId, hidden }) as CalendarSelectionRow;

const event = (id: string, calendarId: string) => ({ id, calendarId }) as CalendarEventRecord;

describe('toggling one calendar', () => {
  test('leaves every other calendar as it is', () => {
    // "Shop" was hidden by a toggle still in flight; reverting a failed
    // toggle of "Procurement" must not bring it back.
    const rows = [row('procurement'), row('shop', true)];

    expect(withCalendarHidden(rows, 'procurement', true)).toEqual([
      row('procurement', true),
      row('shop', true),
    ]);
  });

  test('applies to the calendar list by its id', () => {
    const calendars = [
      { id: 'procurement', hidden: false },
      { id: 'shop', hidden: false },
    ] as CalendarSummary[];

    expect(withSummaryHidden(calendars, 'shop', true)?.map((c) => c.hidden)).toEqual([false, true]);
  });

  test('leaves an unloaded cache unloaded', () => {
    expect(withCalendarHidden(undefined, 'shop', true)).toBeUndefined();
    expect(withSummaryHidden(undefined, 'shop', true)).toBeUndefined();
    expect(withoutCalendarEvents(undefined, 'shop')).toBeUndefined();
  });
});

describe('hiding a calendar', () => {
  test('takes its events out of the loaded window without a request', () => {
    const events = [event('a', 'procurement'), event('b', 'shop'), event('c', 'shop')];

    expect(withoutCalendarEvents(events, 'shop')?.map((e) => e.id)).toEqual(['a']);
  });

  test('keeps a shared mailbox calendar apart from one with the same raw id', () => {
    // Sibling mailboxes' calendars arrive as "{accountId}:{calendarId}", so
    // the match has to be on the whole id.
    const events = [event('a', 'acct-1:calendar'), event('b', 'calendar')];

    expect(withoutCalendarEvents(events, 'calendar')?.map((e) => e.id)).toEqual(['a']);
  });
});
