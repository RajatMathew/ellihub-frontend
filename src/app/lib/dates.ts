/**
 * Dates come in two kinds, and the day-early bugs all came from treating one as
 * the other.
 *
 * - A **calendar date** is a day with no time: a TCO, a due date, a start date.
 *   The API sends it as that day's UTC midnight (`2027-01-01T00:00:00.000Z`;
 *   the wire snapshot marks these `string:date`), sometimes as a bare
 *   `2027-01-01`. It means the same day to everyone, so it is read as the text
 *   `YYYY-MM-DD` and never converted into a timezone. `new Date(value)` and a
 *   local format turned Jan 1 into Dec 31 anywhere west of UTC — New York,
 *   where the users are.
 * - An **instant** is a moment: createdAt, approvedAt. Those are shown in the
 *   viewer's own time with `formatDate` / `formatDateTime` in `helpers.ts`.
 *
 * Which day it is *for the business* (overdue, the monthly-bill period) is read
 * in `BUSINESS_TIME_ZONE`, the same zone the API uses.
 */

/** A calendar date, `YYYY-MM-DD`. */
export type DateOnly = string;

/** The office's zone; matches `BUSINESS_TIME_ZONE` in elli-core's config. */
export const BUSINESS_TIME_ZONE = 'America/New_York';

const MS_PER_DAY = 86_400_000;
const ISO_DAY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?=$|T|\s)/;
// The API still spells a few payment dates the US way.
const US_DAY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function pad(value: number, width = 2) {
  return String(value).padStart(width, '0');
}

function fromParts(year: number, month: number, day: number): DateOnly | null {
  const probe = new Date(Date.UTC(year, month - 1, day));
  const real =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
  return real ? `${pad(year, 4)}-${pad(month)}-${pad(day)}` : null;
}

/**
 * The calendar day a value names, or null.
 *
 * Reads the day off an API string as written — `2027-01-01`,
 * `2027-01-01T00:00:00.000Z`, `01/01/2027` — without moving it into any zone.
 * A `Date` is a day the user picked on a calendar control, so its local fields
 * are the day they saw.
 */
export function toDateOnly(value: string | Date | null | undefined): DateOnly | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const text = value.trim();
  const iso = ISO_DAY_PREFIX.exec(text);
  if (iso) return fromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const us = US_DAY.exec(text);
  if (us) return fromParts(Number(us[3]), Number(us[1]), Number(us[2]));

  return null;
}

function toUtcNoon(dateOnly: DateOnly) {
  const [year, month, day] = dateOnly.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day, 12));
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/**
 * Prints a calendar date, "Dec 31, 2026" by default — the same day for every
 * viewer. Returns `fallback` when there is no valid day, never "Invalid Date".
 */
export function formatDateOnly(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT,
  fallback = ''
): string {
  const day = toDateOnly(value);
  if (!day) return fallback;
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(toUtcNoon(day));
}

/**
 * Today as a calendar date: the viewer's own day by default, or the day in a
 * named zone (`BUSINESS_TIME_ZONE` for anything the business decides).
 * `toISOString().slice(0, 10)` gave the UTC day — tomorrow from 8 PM in New
 * York, yesterday before 5:30 AM in India.
 */
export function todayDateOnly(timeZone?: string, now: Date = new Date()): DateOnly {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
  return fromParts(part('year'), part('month'), part('day')) as DateOnly;
}

/** -1, 0 or 1. `YYYY-MM-DD` sorts correctly as text. */
export function compareDateOnly(left: DateOnly, right: DateOnly): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function addDaysToDateOnly(value: DateOnly, days: number): DateOnly {
  const shifted = new Date(toUtcNoon(value).getTime() + days * MS_PER_DAY);
  return fromParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  ) as DateOnly;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetweenDateOnly(from: DateOnly, to: DateOnly): number {
  return Math.round((toUtcNoon(to).getTime() - toUtcNoon(from).getTime()) / MS_PER_DAY);
}

/** A calendar date as a local `Date` at midnight, for calendar controls that want one. */
export function dateOnlyToLocalDate(value: string | null | undefined): Date | null {
  const day = toDateOnly(value);
  if (!day) return null;
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, date);
}

/**
 * Whether a calendar date is already behind us on the business calendar — a
 * due date is "past due" from the next day, the same moment for every viewer.
 * The API's `isPastDue` / `isOverdue` apply this same rule; this is for data
 * that does not carry them.
 */
export function isBeforeBusinessToday(
  value: string | null | undefined,
  now: Date = new Date()
): boolean {
  const day = toDateOnly(value);
  return day !== null && day < todayDateOnly(BUSINESS_TIME_ZONE, now);
}

/** Whole business days since a calendar date; 0 for today, the future or no date. */
export function businessDaysSince(value: string | null | undefined, now: Date = new Date()) {
  const day = toDateOnly(value);
  if (!day) return 0;
  return Math.max(0, daysBetweenDateOnly(day, todayDateOnly(BUSINESS_TIME_ZONE, now)));
}
