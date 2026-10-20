import { afterAll, describe, expect, test } from 'bun:test';

import {
  addDaysToDateOnly,
  BUSINESS_TIME_ZONE,
  businessDaysSince,
  compareDateOnly,
  dateOnlyToLocalDate,
  daysBetweenDateOnly,
  formatDateOnly,
  isBeforeBusinessToday,
  toDateOnly,
  todayDateOnly,
} from '../src/app/lib/dates';
import { restoreViewerTimeZone, setViewerTimeZone } from './host-time-zone';

/**
 * A calendar date reads the same day for everyone.
 *
 * The portfolio card printed a TCO of Jan 1, 2027 (`2027-01-01T00:00:00.000Z`)
 * as "Dec 31, 2026" in New York and "Jan 01, 2027" in India, because it went
 * through `new Date()` and the viewer's clock. Every case runs under the zones
 * the app is used and built in, and must give one answer.
 */

const VIEWER_ZONES = ['America/New_York', 'Asia/Kolkata', 'UTC', 'Pacific/Honolulu'];
afterAll(() => {
  restoreViewerTimeZone();
});

function inEveryZone(name: string, run: () => void) {
  for (const zone of VIEWER_ZONES) {
    test(`${name} (viewer in ${zone})`, () => {
      setViewerTimeZone(zone);
      run();
    });
  }
}

describe('reading a calendar date', () => {
  inEveryZone('takes the day as written, in every shape the API sends', () => {
    expect(toDateOnly('2027-01-01T00:00:00.000Z')).toBe('2027-01-01');
    expect(toDateOnly('2027-01-01')).toBe('2027-01-01');
    expect(toDateOnly('12/31/2026')).toBe('2026-12-31');
  });

  inEveryZone('takes a picked calendar day as the day the user saw', () => {
    expect(toDateOnly(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('has no day for nothing, nonsense or an impossible date', () => {
    for (const value of [null, undefined, '', 'nonsense', '2027-02-29', new Date('x')]) {
      expect(toDateOnly(value)).toBeNull();
    }
    expect(toDateOnly('2028-02-29')).toBe('2028-02-29');
  });
});

describe('printing a calendar date', () => {
  inEveryZone('shows the stored day, never the day before', () => {
    expect(formatDateOnly('2027-01-01T00:00:00.000Z')).toBe('Jan 1, 2027');
    expect(
      formatDateOnly('2027-01-01T00:00:00.000Z', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    ).toBe('Jan 01, 2027');
  });

  test('prints the fallback, not "Invalid Date", when there is no day', () => {
    expect(formatDateOnly(null)).toBe('');
    expect(formatDateOnly('', undefined, '—')).toBe('—');
  });
});

describe('today', () => {
  // 9 PM on Dec 31 in New York is already Jan 1 in UTC and in India.
  const newYearsEveEvening = new Date('2027-01-01T02:00:00.000Z');

  inEveryZone('for the business is the New York day', () => {
    expect(todayDateOnly(BUSINESS_TIME_ZONE, newYearsEveEvening)).toBe('2026-12-31');
  });

  test('for a viewer is their own day, not the UTC one', () => {
    setViewerTimeZone('America/New_York');
    expect(todayDateOnly(undefined, newYearsEveEvening)).toBe('2026-12-31');
    setViewerTimeZone('Asia/Kolkata');
    expect(todayDateOnly(undefined, newYearsEveEvening)).toBe('2027-01-01');
  });
});

describe('day arithmetic', () => {
  inEveryZone('crosses months, years and daylight saving exactly', () => {
    expect(addDaysToDateOnly('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateOnly('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetweenDateOnly('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetweenDateOnly('2026-10-04', '2026-10-01')).toBe(-3);
    expect(compareDateOnly('2026-09-30', '2026-10-01')).toBe(-1);
  });

  inEveryZone('hands a calendar control the day as a local midnight', () => {
    const local = dateOnlyToLocalDate('2027-01-01T00:00:00.000Z');
    expect([local?.getFullYear(), local?.getMonth(), local?.getDate()]).toEqual([2027, 0, 1]);
  });
});

describe('past due', () => {
  // 10 PM on Sep 30 in New York: already Oct 1 in UTC and in India.
  const evening = new Date('2026-10-01T02:00:00.000Z');

  inEveryZone('starts the day after the due date on the business calendar', () => {
    // Comparing the due date's UTC midnight with the clock turned an invoice due
    // Oct 1 "Past due" at 8 PM on Sep 30 in New York.
    expect(isBeforeBusinessToday('2026-10-01T00:00:00.000Z', evening)).toBe(false);
    expect(isBeforeBusinessToday('2026-09-30T00:00:00.000Z', evening)).toBe(false);
    expect(isBeforeBusinessToday('2026-09-29T00:00:00.000Z', evening)).toBe(true);
    expect(isBeforeBusinessToday(null, evening)).toBe(false);
  });

  inEveryZone('counts whole business days late', () => {
    expect(businessDaysSince('2026-09-27T00:00:00.000Z', evening)).toBe(3);
    expect(businessDaysSince('2026-10-05', evening)).toBe(0);
  });
});
