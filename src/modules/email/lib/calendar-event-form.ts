import { addDays, differenceInCalendarDays, format, parse, startOfDay } from 'date-fns';

/**
 * The rules the calendar event dialog applies between what the form holds and
 * what it saves (elli-ui#1260). The form edits one date and two times, which
 * cannot say "three days" or "ends tomorrow"; these keep what the form cannot
 * show from being lost on save.
 */

interface EventSpan {
  start: Date;
  end: Date;
  allDay?: boolean;
}

/**
 * How many days an all-day event covers. Its end is exclusive, so a one-day
 * event on the 3rd runs to the start of the 4th. Never less than one.
 */
export function allDaySpan(event: EventSpan | null | undefined): number {
  if (!event?.allDay) return 1;

  return Math.max(1, differenceInCalendarDays(event.end, event.start));
}

/**
 * An all-day range starting on `day` and covering `spanDays` days.
 *
 * Counted in calendar days, not minutes. The end used to be the start plus
 * 1,440 minutes, which on the day the clocks go back (25 hours long) landed on
 * 11 pm of the same day — the date then went to the server as the start date,
 * and the event came back zero days long. On the day they go forward it
 * overshot into the next date.
 */
export function allDayRange(day: Date, spanDays: number): { start: Date; end: Date } {
  const start = startOfDay(day);
  return { start, end: addDays(start, Math.max(1, spanDays)) };
}

/** Whether a timed event ends on a later calendar day than it starts. */
export function endsOnLaterDay(event: EventSpan | null | undefined): boolean {
  if (!event || event.allDay) return false;

  return differenceInCalendarDays(event.end, event.start) > 0;
}

/**
 * The end of a timed event from the form's single date.
 *
 * An event that already ran past midnight — an overnight pour, a night shift —
 * opens with an end time earlier than its start, and saving it unchanged used
 * to fail with "End time must be after start time". When the event being edited
 * or copied crossed midnight, an end at or before the start means the next day.
 * A new event still has to end after it starts.
 */
export function timedEnd(start: Date, endOnStartDay: Date, overnight: boolean): Date {
  if (overnight && endOnStartDay <= start) return addDays(endOnStartDay, 1);

  return endOnStartDay;
}

/**
 * The location to send with an edit, or `undefined` to leave it as it is.
 *
 * An empty field used to become `undefined` too, which the API reads as "no
 * change" — so clearing a location saved and then put it straight back. Sent
 * only when the user changed it, and as an empty string when they emptied it,
 * which clears it in Outlook.
 */
export function editedLocation(current: string, seeded: string): string | undefined {
  const next = current.trim();
  return next === seeded.trim() ? undefined : next;
}

/** The title a duplicated event starts with. */
export function duplicateTitle(title: string): string {
  return `${title} (copy)`;
}

/**
 * An event date as the API wants it. All-day events are calendar dates, not
 * instants — the wire value is built from the LOCAL date parts so the server's
 * date extraction can never shift a day across timezones. Timed events stay
 * real instants. Shared by the Calendar tab and "+ Add event" on a thread.
 */
export function serializeEventDate(value: Date, isAllDay: boolean | undefined): string {
  return isAllDay ? `${format(value, 'yyyy-MM-dd')}T00:00:00.000Z` : value.toISOString();
}

/**
 * Whether the event being made starts before now — the warning a date taken
 * from an older email needs (elli-ui#686), since its "tomorrow" may be long
 * gone. An all-day event is past only once its whole day is; today is not.
 */
export function startsInPast(
  form: { date: string; startTime: string; allDay: boolean },
  now: Date = new Date()
): boolean {
  if (form.allDay) {
    const day = parse(form.date, 'yyyy-MM-dd', now);
    return !Number.isNaN(day.getTime()) && day < startOfDay(now);
  }
  const start = parse(`${form.date} ${form.startTime}`, 'yyyy-MM-dd HH:mm', now);
  return !Number.isNaN(start.getTime()) && start < now;
}
