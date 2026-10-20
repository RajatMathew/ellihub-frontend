import type { CalendarEventRecord } from '@/modules/email/api';

/**
 * The colors a user can give one event (elli-ui#830), in the order the picker
 * lays them out — warm to cool, then the neutrals, as Google Calendar does.
 *
 * The keys are the wire values: `elli-core` validates them against its own
 * `CALENDAR_EVENT_COLORS` and stores them on the user's annotation row, so the
 * two lists must change together.
 */
export const EVENT_COLOR_KEYS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'stone',
  'gray',
] as const;

export type EventColorKey = (typeof EVENT_COLOR_KEYS)[number];

const EVENT_COLOR_SET: ReadonlySet<string> = new Set(EVENT_COLOR_KEYS);

/**
 * The stored color as a palette key, or null. A value this build does not
 * know — a key a newer API added, or a field an older API never sends — falls
 * back to the calendar's color instead of drawing an event with no styles.
 */
export function toEventColorKey(value: string | null | undefined): EventColorKey | null {
  return value && EVENT_COLOR_SET.has(value) ? (value as EventColorKey) : null;
}

export function eventColorLabel(key: EventColorKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * A loaded event window with one event recolored — the optimistic half of
 * picking a color. Only the matching event (same id on the same calendar) is
 * touched; every other field is carried forward.
 */
export function withEventColor(
  events: CalendarEventRecord[] | undefined,
  calendarId: string,
  eventId: string,
  color: EventColorKey | null
): CalendarEventRecord[] | undefined {
  return events?.map((event) =>
    event.id === eventId && event.calendarId === calendarId ? { ...event, color } : event
  );
}
