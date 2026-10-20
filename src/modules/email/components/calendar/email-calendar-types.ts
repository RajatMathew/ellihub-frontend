import type {
  CalendarAttendee,
  CalendarEventRecord,
  CalendarSelectionRow,
} from '@/modules/email/api';
import { toEventColorKey, type EventColorKey } from '@/modules/email/lib/calendar-event-colors';

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
  /** The organizer's address, when the provider gives one — search uses it. */
  organizerEmail?: string;
  /** Invited attendees. Adding one here sends them an invitation email. */
  attendees: CalendarAttendee[];
  /** Teams (or other provider) join link, when the event is an online meeting. */
  onlineMeetingUrl?: string;
  /** Part of a recurring series (occurrence or master). */
  isRecurring?: boolean;
  /**
   * Present on occurrences of a series — deleting this id (instead of `id`)
   * deletes the whole series. `null`/undefined on a non-recurring event or
   * the series master itself (which already deletes the series via `id`).
   */
  seriesMasterId?: string | null;
  /** What the event is drawn in: the user's own color, else its calendar's. */
  color: CalendarEventColor;
  /** The user's own color for the event, or null when it follows its calendar. */
  customColor: EventColorKey | null;
  /** The projects of the threads it is linked to — none of its own (elli-ui#1381). */
  projects: Array<{ id: string; name: string }>;
  /** Full-day banner (spans the top row on week/day, whole cell on month). */
  allDay?: boolean;
  /**
   * Marked done — treated like a completed task. The card dims, the title
   * strikes through, and the color tint fades. Undo by clicking the
   * checkmark quick action again.
   */
  done?: boolean;
}

/**
 * Event colors. An event is drawn in its calendar's color unless the user gave
 * it one of its own from the picker (`EVENT_COLOR_KEYS`). `primary` is the
 * theme accent and only ever comes from a calendar — the user's main one.
 *
 * Each tone is a soft tint with a matching border and text, the way the
 * Untitled UI calendar draws its events, so a week of colored events reads as
 * labels rather than a wall of saturated blocks.
 */
export type CalendarEventColor = 'primary' | EventColorKey;

export const CALENDAR_EVENT_STYLES: Record<
  CalendarEventColor,
  {
    /** Solid swatch: the picker dot, the hover card's rail. */
    accent: string;
    /** Soft tint behind the event. */
    bg: string;
    /** The event's title. */
    text: string;
    /** Secondary text inside the event — its time. */
    subtle: string;
    /** Border around the event. */
    border: string;
  }
> = {
  primary: {
    accent: 'bg-primary',
    bg: 'bg-primary/10',
    text: 'text-primary',
    subtle: 'text-primary/75',
    border: 'border-primary/25',
  },
  red: {
    accent: 'bg-red-500 dark:bg-red-400',
    bg: 'bg-red-50 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-300',
    subtle: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-400/30',
  },
  orange: {
    accent: 'bg-orange-500 dark:bg-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-300',
    subtle: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-400/30',
  },
  amber: {
    accent: 'bg-amber-500 dark:bg-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    subtle: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-400/30',
  },
  yellow: {
    accent: 'bg-yellow-500 dark:bg-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/15',
    text: 'text-yellow-700 dark:text-yellow-300',
    subtle: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-400/30',
  },
  lime: {
    accent: 'bg-lime-500 dark:bg-lime-400',
    bg: 'bg-lime-50 dark:bg-lime-500/15',
    text: 'text-lime-700 dark:text-lime-300',
    subtle: 'text-lime-600 dark:text-lime-400',
    border: 'border-lime-200 dark:border-lime-400/30',
  },
  green: {
    accent: 'bg-green-500 dark:bg-green-400',
    bg: 'bg-green-50 dark:bg-green-500/15',
    text: 'text-green-700 dark:text-green-300',
    subtle: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-400/30',
  },
  emerald: {
    accent: 'bg-emerald-500 dark:bg-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    subtle: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-400/30',
  },
  teal: {
    accent: 'bg-teal-500 dark:bg-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-300',
    subtle: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-400/30',
  },
  cyan: {
    accent: 'bg-cyan-500 dark:bg-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/15',
    text: 'text-cyan-700 dark:text-cyan-300',
    subtle: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-400/30',
  },
  sky: {
    accent: 'bg-sky-500 dark:bg-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    subtle: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-400/30',
  },
  blue: {
    accent: 'bg-blue-500 dark:bg-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    subtle: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-400/30',
  },
  indigo: {
    accent: 'bg-indigo-500 dark:bg-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    subtle: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-400/30',
  },
  violet: {
    accent: 'bg-violet-500 dark:bg-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-300',
    subtle: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-400/30',
  },
  purple: {
    accent: 'bg-purple-500 dark:bg-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    subtle: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-400/30',
  },
  fuchsia: {
    accent: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/15',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    subtle: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-200 dark:border-fuchsia-400/30',
  },
  pink: {
    accent: 'bg-pink-500 dark:bg-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-500/15',
    text: 'text-pink-700 dark:text-pink-300',
    subtle: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-400/30',
  },
  rose: {
    accent: 'bg-rose-500 dark:bg-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    subtle: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-400/30',
  },
  stone: {
    accent: 'bg-stone-500 dark:bg-stone-400',
    bg: 'bg-stone-50 dark:bg-stone-500/15',
    text: 'text-stone-700 dark:text-stone-300',
    subtle: 'text-stone-600 dark:text-stone-400',
    border: 'border-stone-200 dark:border-stone-400/30',
  },
  gray: {
    accent: 'bg-gray-500 dark:bg-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-500/15',
    text: 'text-gray-700 dark:text-gray-300',
    subtle: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-400/30',
  },
};

// The tones calendars are hashed onto. The order is load-bearing: it is the
// order the old six-token palette had, so every calendar keeps the color it
// already showed in.
const CALENDAR_COLOR_TOKENS: CalendarEventColor[] = [
  'primary',
  'sky',
  'emerald',
  'amber',
  'violet',
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
  const index = Math.abs(hash) % CALENDAR_COLOR_TOKENS.length;
  return CALENDAR_COLOR_TOKENS[index] ?? 'primary';
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
  const customColor = toEventColorKey(record.color);
  return {
    id: record.id,
    calendarId: record.calendarId,
    title: record.subject ?? '(No subject)',
    start,
    end: Number.isNaN(end.getTime()) ? start : end,
    description: record.description ?? undefined,
    location: record.location ?? undefined,
    onlineMeetingUrl: record.onlineMeetingUrl ?? undefined,
    isRecurring: record.isRecurring ?? false,
    seriesMasterId: record.seriesMasterId ?? null,
    organizer: record.organizer?.name ?? record.organizer?.email ?? undefined,
    organizerEmail: record.organizer?.email ?? undefined,
    attendees: record.attendees ?? [],
    projects: record.projects ?? [],
    color:
      customColor ??
      (row
        ? colorForCalendar({ aurinkoCalendarId: row.aurinkoCalendarId, isPrimary: row.isPrimary })
        : 'primary'),
    customColor,
    allDay: record.isAllDay,
    done: record.done,
  };
}
