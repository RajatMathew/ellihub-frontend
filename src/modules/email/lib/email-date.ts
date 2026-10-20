import { format, isSameDay, isSameYear, isValid, parseISO } from 'date-fns';

export function formatEmailDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy, h:mm a') : value;
}

const MS_PER_DAY = 86_400_000;

/**
 * The timestamp on a conversation row: as short as it can be and still say
 * when.
 *
 * The full `Sep 12, 2026, 9:30 PM` was a third of the row's top line, pushing
 * the participants into an ellipsis on a column 404px wide (elli-ui#921).
 * Recency is what a scanning reader is actually reading here, so today is a
 * clock, this week is a weekday, and anything older is a date — with the year
 * only when it is not this one, because that is the only time it carries
 * information.
 *
 * `now` is a parameter so the result can be tested without mocking the clock.
 */
export function formatEmailListDate(value: string, now: Date = new Date()): string {
  const date = parseISO(value);
  if (!isValid(date)) return value;

  if (isSameDay(date, now)) return format(date, 'h:mm a');
  if (withinPastWeek(date, now)) return format(date, 'EEE h:mm a');
  return isSameYear(date, now) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
}

/**
 * The timestamp on one message inside an open thread. Longer than the row's,
 * because here the reader is placing messages relative to each other rather
 * than scanning a column, and "Tue" alone is ambiguous across a long thread.
 */
export function formatEmailMessageDate(value: string, now: Date = new Date()): string {
  const date = parseISO(value);
  if (!isValid(date)) return value;

  if (isSameDay(date, now)) return `Today ${format(date, 'h:mm a')}`;
  const yesterday = new Date(now.getTime() - MS_PER_DAY);
  if (isSameDay(date, yesterday)) return `Yesterday ${format(date, 'h:mm a')}`;
  if (withinPastWeek(date, now)) return format(date, 'EEE h:mm a');
  return isSameYear(date, now) ? format(date, 'MMM d, h:mm a') : format(date, 'MMM d yyyy, h:mm a');
}

/**
 * Within the last seven days, and not in the future.
 *
 * A message dated ahead of the clock — a sender's skewed clock, or a timezone
 * the provider reported oddly — would otherwise take the weekday branch and
 * render as a weekday that has not happened yet.
 */
function withinPastWeek(date: Date, now: Date): boolean {
  const elapsed = now.getTime() - date.getTime();
  return elapsed >= 0 && elapsed < 7 * MS_PER_DAY;
}
