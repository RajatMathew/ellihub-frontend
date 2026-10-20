import type {
  CalendarEventRecord,
  CalendarSelectionRow,
  CalendarSummary,
} from '@/modules/email/api';

/**
 * The cache transforms behind the calendar picker's show/hide checkbox
 * (elli-ui#1240).
 *
 * Each one touches the toggled calendar only. The picker used to roll a failed
 * toggle back by restoring a snapshot of the whole list, which would also undo
 * any other calendar toggled while the first was in flight.
 */

export function withCalendarHidden(
  rows: CalendarSelectionRow[] | undefined,
  calendarId: string,
  hidden: boolean
): CalendarSelectionRow[] | undefined {
  return rows?.map((row) => (row.aurinkoCalendarId === calendarId ? { ...row, hidden } : row));
}

export function withSummaryHidden(
  calendars: CalendarSummary[] | undefined,
  calendarId: string,
  hidden: boolean
): CalendarSummary[] | undefined {
  return calendars?.map((calendar) =>
    calendar.id === calendarId ? { ...calendar, hidden } : calendar
  );
}

/**
 * A loaded event window with one calendar taken out.
 *
 * Hiding a calendar needs no request: its events are already on screen, and
 * the server would answer with the same window minus them. Re-reading every
 * selected calendar live from the provider took seconds, and the picker stayed
 * locked for all of it.
 */
export function withoutCalendarEvents(
  events: CalendarEventRecord[] | undefined,
  calendarId: string
): CalendarEventRecord[] | undefined {
  return events?.filter((event) => event.calendarId !== calendarId);
}
