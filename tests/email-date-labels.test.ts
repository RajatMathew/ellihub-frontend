import { describe, expect, test } from 'bun:test';

import { formatEmailListDate, formatEmailMessageDate } from '../src/modules/email/lib/email-date';

/**
 * The row and message timestamps of the redesigned mailbox (elli-ui#921).
 *
 * The clock is passed in on purpose — every case below is relative to "now",
 * and a test that read the real clock would pass in September and fail in
 * January when the year branch flips.
 */
const NOW = new Date('2026-09-16T14:30:00');

/** Local-time ISO, so the assertions do not shift with the runner's timezone. */
function at(iso: string) {
  return new Date(iso).toISOString();
}

describe('formatEmailListDate', () => {
  test('shows only the clock for mail that arrived today', () => {
    expect(formatEmailListDate(at('2026-09-16T09:05:00'), NOW)).toBe('9:05 AM');
  });

  test('shows the weekday for mail from earlier in the week', () => {
    expect(formatEmailListDate(at('2026-09-14T16:20:00'), NOW)).toBe('Mon 4:20 PM');
  });

  test('drops the clock once mail is more than a week old', () => {
    expect(formatEmailListDate(at('2026-09-01T16:20:00'), NOW)).toBe('Sep 1');
  });

  test('keeps the year on mail from a different year', () => {
    expect(formatEmailListDate(at('2025-12-30T16:20:00'), NOW)).toBe('Dec 30, 2025');
  });

  test('exactly seven days ago is old enough to lose the weekday', () => {
    // The boundary the branch turns on: a "Wed" seven days back is the same
    // word as today, which is exactly the ambiguity the date branch exists for.
    expect(formatEmailListDate(at('2026-09-09T14:30:00'), NOW)).toBe('Sep 9');
  });

  test('a future timestamp never renders as a weekday that has not happened', () => {
    // Provider clock skew and odd timezones both produce these. Without the
    // guard, tomorrow's message renders as "Thu" — a day in the future.
    expect(formatEmailListDate(at('2026-09-18T09:00:00'), NOW)).toBe('Sep 18');
  });

  test('passes an unparseable value straight through', () => {
    expect(formatEmailListDate('Sending...', NOW)).toBe('Sending...');
  });
});

describe('formatEmailMessageDate', () => {
  test('names today and yesterday rather than dating them', () => {
    expect(formatEmailMessageDate(at('2026-09-16T09:05:00'), NOW)).toBe('Today 9:05 AM');
    expect(formatEmailMessageDate(at('2026-09-15T22:40:00'), NOW)).toBe('Yesterday 10:40 PM');
  });

  test('keeps the clock on an older message, unlike the list row', () => {
    expect(formatEmailMessageDate(at('2026-09-01T16:20:00'), NOW)).toBe('Sep 1, 4:20 PM');
  });

  test('adds the year across a year boundary', () => {
    expect(formatEmailMessageDate(at('2025-12-30T16:20:00'), NOW)).toBe('Dec 30 2025, 4:20 PM');
  });

  test('passes an unparseable value straight through', () => {
    expect(formatEmailMessageDate('Sending...', NOW)).toBe('Sending...');
  });
});
