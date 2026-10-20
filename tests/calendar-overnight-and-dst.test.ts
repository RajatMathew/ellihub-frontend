import { describe, expect, test } from 'bun:test';
import { addMinutes } from 'date-fns';

import { layoutOverlappingEvents } from '../src/modules/email/components/calendar/calendar-collisions';
import { overlapsDay, timedPiecesForDay } from '../src/modules/email/lib/calendar-day-pieces';
import {
  allDayRange,
  allDaySpan,
  duplicateTitle,
  editedLocation,
  endsOnLaterDay,
  timedEnd,
} from '../src/modules/email/lib/calendar-event-form';

/**
 * Calendar fixes from elli-ui#1260. The suite runs on a New York clock
 * (tests/setup-time-zone.ts), which is where the daylight-saving cases bite.
 */

// Local wall time in the suite's zone.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const event = (start: Date, end: Date, extra: { id?: string; allDay?: boolean } = {}) => ({
  id: extra.id ?? 'event-1',
  start,
  end,
  allDay: extra.allDay,
});

describe('an event that runs past midnight', () => {
  const shift = event(at(2026, 10, 5, 22), at(2026, 10, 6, 6), { id: 'night-shift' });

  test('shows on the night it starts, from its start to midnight', () => {
    const [piece] = timedPiecesForDay([shift], at(2026, 10, 5));

    expect(piece?.start).toEqual(at(2026, 10, 5, 22));
    expect(piece?.end).toEqual(at(2026, 10, 6));
  });

  test('shows on the morning it ends too, from midnight to its end', () => {
    // The timeline used to place an event only on its start day, so this one
    // was missing from Tuesday entirely.
    const [piece] = timedPiecesForDay([shift], at(2026, 10, 6));

    expect(piece?.start).toEqual(at(2026, 10, 6));
    expect(piece?.end).toEqual(at(2026, 10, 6, 6));
  });

  test('keeps the whole event on each piece, for edit, delete and its time label', () => {
    for (const day of [at(2026, 10, 5), at(2026, 10, 6)]) {
      expect(timedPiecesForDay([shift], day)[0]?.event).toBe(shift);
    }
  });

  test('is not on the day after it ends', () => {
    expect(timedPiecesForDay([shift], at(2026, 10, 7))).toEqual([]);
  });

  test('covers every day in between when it runs for several', () => {
    const pour = event(at(2026, 10, 5, 20), at(2026, 10, 7, 4));
    const middle = timedPiecesForDay([pour], at(2026, 10, 6))[0];

    expect(middle?.start).toEqual(at(2026, 10, 6));
    expect(middle?.end).toEqual(at(2026, 10, 7));
  });
});

describe('which days an event touches', () => {
  test('an event ending exactly at midnight stays on its own day', () => {
    const evening = event(at(2026, 10, 5, 18), at(2026, 10, 6));

    expect(overlapsDay(evening, at(2026, 10, 5))).toBe(true);
    expect(overlapsDay(evening, at(2026, 10, 6))).toBe(false);
  });

  test('a zero-length event still shows on its day', () => {
    const marker = event(at(2026, 10, 5, 9), at(2026, 10, 5, 9));

    expect(timedPiecesForDay([marker], at(2026, 10, 5))).toHaveLength(1);
    expect(timedPiecesForDay([marker], at(2026, 10, 6))).toHaveLength(0);
  });

  test('all-day events are left to the banner row', () => {
    const allDay = event(at(2026, 10, 5), at(2026, 10, 6), { allDay: true });

    expect(timedPiecesForDay([allDay], at(2026, 10, 5))).toEqual([]);
  });

  test('pieces lay out side by side like events', () => {
    const shift = event(at(2026, 10, 5, 22), at(2026, 10, 6, 6), { id: 'shift' });
    const early = event(at(2026, 10, 6, 5), at(2026, 10, 6, 7), { id: 'early' });
    const laidOut = layoutOverlappingEvents(timedPiecesForDay([shift, early], at(2026, 10, 6)));

    expect(laidOut.map((entry) => entry.totalColumns)).toEqual([2, 2]);
    expect(laidOut.map((entry) => entry.event.event.id)).toEqual(['shift', 'early']);
  });
});

describe('an all-day event saved on the day the clocks change', () => {
  test('ends at the next midnight when the clocks go back (a 25-hour day)', () => {
    const { start, end } = allDayRange(at(2026, 11, 1), 1);

    expect(start).toEqual(at(2026, 11, 1));
    expect(end).toEqual(at(2026, 11, 2));
    // What it used to compute: 11 pm the same day, so the event was saved
    // zero days long.
    expect(addMinutes(start, 24 * 60)).toEqual(at(2026, 11, 1, 23));
  });

  test('ends at the next midnight when the clocks go forward (a 23-hour day)', () => {
    expect(allDayRange(at(2026, 3, 8), 1).end).toEqual(at(2026, 3, 9));
  });
});

describe('editing an all-day event that covers several days', () => {
  test('keeps its length, though the form shows only its first day', () => {
    const conference = event(at(2026, 10, 5), at(2026, 10, 8), { allDay: true });

    expect(allDaySpan(conference)).toBe(3);
    expect(allDayRange(at(2026, 10, 12), allDaySpan(conference)).end).toEqual(at(2026, 10, 15));
  });

  test('a one-day event, a timed event and a new event are one day', () => {
    expect(allDaySpan(event(at(2026, 10, 5), at(2026, 10, 6), { allDay: true }))).toBe(1);
    expect(allDaySpan(event(at(2026, 10, 5, 9), at(2026, 10, 5, 10)))).toBe(1);
    expect(allDaySpan(null)).toBe(1);
  });
});

describe('editing an event that runs past midnight', () => {
  test('an end earlier than the start means the next morning', () => {
    const start = at(2026, 10, 5, 22);

    expect(timedEnd(start, at(2026, 10, 5, 6), true)).toEqual(at(2026, 10, 6, 6));
  });

  test('a new event still has to end after it starts', () => {
    const start = at(2026, 10, 5, 22);

    expect(timedEnd(start, at(2026, 10, 5, 6), false)).toEqual(at(2026, 10, 5, 6));
  });

  test('is recognised from its own start and end', () => {
    expect(endsOnLaterDay(event(at(2026, 10, 5, 22), at(2026, 10, 6, 6)))).toBe(true);
    expect(endsOnLaterDay(event(at(2026, 10, 5, 9), at(2026, 10, 5, 17)))).toBe(false);
    expect(endsOnLaterDay(event(at(2026, 10, 5), at(2026, 10, 6), { allDay: true }))).toBe(false);
  });
});

describe('the location sent with an edit', () => {
  test('is an empty string when the user cleared it, which clears it in Outlook', () => {
    // It used to be `undefined`, which the API reads as "leave it alone".
    expect(editedLocation('', 'Site trailer')).toBe('');
    expect(editedLocation('   ', 'Site trailer')).toBe('');
  });

  test('is left out when it did not change', () => {
    expect(editedLocation('Site trailer', 'Site trailer')).toBeUndefined();
    expect(editedLocation(' Site trailer ', 'Site trailer')).toBeUndefined();
    expect(editedLocation('', '')).toBeUndefined();
  });

  test('is the new value when it changed', () => {
    expect(editedLocation('Gate 3', 'Site trailer')).toBe('Gate 3');
  });
});

test('a duplicated event is titled as a copy', () => {
  expect(duplicateTitle('Site walk')).toBe('Site walk (copy)');
});
