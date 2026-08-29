import type { CalendarEventRecord, CalendarSelectionRow } from '@/modules/email/api';

/**
 * A calendar event as we render it. The week/day/month views + the timed block
 * all read this shape. Events come from the Aurinko server through the
 * calendar API — see `toCalendarEvent()` to adapt a server record.
 */
export interface CalendarEvent {
  id: string;
  /** Which Aurinko calendar this event belongs to. Needed by every mutation. */
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  organizer?: string;
  color: CalendarEventColor;
  /** Full-day banner (spans the top row on week/day, whole cell on month). */
  allDay?: boolean;
  /**
   * Marked done — treated like a completed task. The card dims, the title
   * strikes through, and the tone rail desaturates. Undo by clicking the
   * checkmark quick action again.
   */
  done?: boolean;
}

/**
 * Colour tokens for events. We keep it to a small palette that reads well on
 * the app's cream / dark backgrounds — assigned per calendar so every event on
 * the same calendar shares a colour.
 */
export type CalendarEventColor = 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'rose';

export const CALENDAR_EVENT_STYLES: Record<
  CalendarEventColor,
  {
    /** Solid accent used for the left rail + full-day chip. */
    accent: string;
    /** Soft background used for the event bar. */
    bg: string;
    /** Text colour used inside the event bar. */
    text: string;
    /** Border applied to the event bar. */
    border: string;
  }
> = {
  primary: {
    accent: 'bg-primary',
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/25',
  },
  success: {
    accent: 'bg-emerald-500 dark:bg-emerald-400',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/25',
  },
  warning: {
    accent: 'bg-amber-500 dark:bg-amber-400',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/25',
  },
  info: {
    accent: 'bg-sky-500 dark:bg-sky-400',
    bg: 'bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/25',
  },
  purple: {
    accent: 'bg-violet-500 dark:bg-violet-400',
    bg: 'bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-500/25',
  },
  rose: {
    accent: 'bg-rose-500 dark:bg-rose-400',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/25',
  },
};

const COLOR_TOKENS: CalendarEventColor[] = [
  'primary',
  'info',
  'success',
  'warning',
  'purple',
  'rose',
];

/**
 * Deterministic color per calendar id. Aurinko may hand us a hex color in
 * `calendar.color`, but the local palette is tokenized so the calendar tone
 * matches the rest of the app in both themes. Hashing the id keeps the choice
 * stable across renders and consistent whenever the user re-opens the view.
 * A primary calendar always renders as `primary` so the user's main calendar
 * lines up with the accent color.
 */
export function colorForCalendar(row: {
  aurinkoCalendarId: string;
  isPrimary?: boolean;
}): CalendarEventColor {
  if (row.isPrimary) return 'primary';
  let hash = 0;
  for (const char of row.aurinkoCalendarId) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  const index = Math.abs(hash) % COLOR_TOKENS.length;
  return COLOR_TOKENS[index] ?? 'primary';
}

/**
 * Adapt a server-side event into the shape the week/day/month components
 * expect. Returns `null` when the server payload is missing a parseable start —
 * the caller must filter these out before rendering so an event with an
 * Invalid Date never sneaks into a day column where `isSameDay(Invalid, day)`
 * silently drops it and the calendar looks empty.
 */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * All-day events arrive as bare dates ("2026-08-26"). `new Date(...)` parses
 * those as UTC midnight, which in any negative-offset timezone is the evening
 * of the PREVIOUS day — the event would render on the wrong date. Parse the
 * date parts as a local date instead; full ISO datetimes pass through.
 */
export function parseEventDate(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toCalendarEvent(
  record: CalendarEventRecord,
  selection: Map<string, CalendarSelectionRow>
): CalendarEvent | null {
  const start = parseEventDate(record.start);
  const end = parseEventDate(record.end);
  if (Number.isNaN(start.getTime())) {
    if (typeof console !== 'undefined') {
      console.warn('[calendar] dropping event with invalid start', {
        id: record.id,
        start: record.start,
      });
    }
    return null;
  }
  const row = selection.get(record.calendarId);
  return {
    id: record.id,
    calendarId: record.calendarId,
    title: record.subject ?? '(No subject)',
    start,
    end: Number.isNaN(end.getTime()) ? start : end,
    description: record.description ?? undefined,
    location: record.location ?? undefined,
    organizer: record.organizer?.name ?? record.organizer?.email ?? undefined,
    color: row
      ? colorForCalendar({ aurinkoCalendarId: row.aurinkoCalendarId, isPrimary: row.isPrimary })
      : 'primary',
    allDay: record.isAllDay,
    done: record.done,
  };
}
