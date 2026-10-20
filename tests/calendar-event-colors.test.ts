import { describe, expect, test } from 'bun:test';

import type { CalendarEventRecord, CalendarSelectionRow } from '../src/modules/email/api';
import {
  CALENDAR_EVENT_STYLES,
  colorForCalendar,
  toCalendarEvent,
} from '../src/modules/email/components/calendar/email-calendar-types';
import {
  EVENT_COLOR_KEYS,
  toEventColorKey,
  withEventColor,
} from '../src/modules/email/lib/calendar-event-colors';

/**
 * Per-event colors (elli-ui#830). The user picks one in the event dialog; the
 * server keeps it on their annotation row; null means the calendar's color.
 */

const record = (overrides: Partial<CalendarEventRecord> = {}): CalendarEventRecord => ({
  id: 'evt-1',
  calendarId: 'cal-shop',
  subject: 'Site walk',
  description: null,
  start: '2026-10-08T14:00:00Z',
  end: '2026-10-08T15:00:00Z',
  isAllDay: false,
  location: null,
  organizer: null,
  attendees: [],
  webLink: null,
  done: false,
  doneAt: null,
  ...overrides,
});

const selection = new Map<string, CalendarSelectionRow>([
  [
    'cal-shop',
    { aurinkoCalendarId: 'cal-shop', name: 'Shop', color: null, isPrimary: false, hidden: false },
  ],
]);
const shopColor = colorForCalendar({ aurinkoCalendarId: 'cal-shop', isPrimary: false });

describe('drawing an event in its color', () => {
  test("the user's own color wins over the calendar's", () => {
    const event = toCalendarEvent(record({ color: 'teal' }), selection);

    expect(event?.color).toBe('teal');
    expect(event?.customColor).toBe('teal');
  });

  test('no color of its own follows the calendar', () => {
    const event = toCalendarEvent(record({ color: null }), selection);

    expect(event?.color).toBe(shopColor);
    expect(event?.customColor).toBeNull();
  });

  test('an API without the field yet reads as the calendar color', () => {
    const event = toCalendarEvent(record(), selection);

    expect(event?.color).toBe(shopColor);
    expect(event?.customColor).toBeNull();
  });

  test('a color this build does not know falls back instead of drawing unstyled', () => {
    // A key a newer API added would otherwise index CALENDAR_EVENT_STYLES to undefined.
    expect(toEventColorKey('mauve')).toBeNull();
    expect(toCalendarEvent(record({ color: 'mauve' }), selection)?.color).toBe(shopColor);
  });

  test('every pickable color has styles', () => {
    for (const key of EVENT_COLOR_KEYS) {
      expect(CALENDAR_EVENT_STYLES[key]?.accent).toBeTruthy();
    }
  });

  test('calendars keep the colors they had before the palette grew', () => {
    // The old palette hashed onto [primary, info, success, warning, purple,
    // rose]; those are now sky, emerald, amber, violet and rose, in that order.
    const legacy = ['primary', 'sky', 'emerald', 'amber', 'violet', 'rose'];
    const legacyColor = (id: string) => {
      let hash = 0;
      for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
      return legacy[Math.abs(hash) % legacy.length];
    };
    for (const id of ['cal-shop', 'AAMkAGI2', 'calendar-3', 'x']) {
      expect(colorForCalendar({ aurinkoCalendarId: id })).toBe(legacyColor(id));
    }
    expect(colorForCalendar({ aurinkoCalendarId: 'x', isPrimary: true })).toBe('primary');
  });
});

describe('recoloring one event in the cache', () => {
  test('changes only the matching event and keeps its other fields', () => {
    const events = [
      record({ id: 'evt-1', done: true }),
      record({ id: 'evt-2' }),
      // Same id on another calendar is a different event.
      record({ id: 'evt-1', calendarId: 'cal-home' }),
    ];

    const next = withEventColor(events, 'cal-shop', 'evt-1', 'rose');

    expect(next?.[0]).toEqual({ ...events[0]!, color: 'rose' });
    expect(next?.[1]).toBe(events[1]);
    expect(next?.[2]).toBe(events[2]);
  });

  test('null puts it back on the calendar color', () => {
    const next = withEventColor([record({ color: 'rose' })], 'cal-shop', 'evt-1', null);

    expect(next?.[0]?.color).toBeNull();
  });

  test('an unloaded window stays unloaded', () => {
    expect(withEventColor(undefined, 'cal-shop', 'evt-1', 'rose')).toBeUndefined();
  });
});
