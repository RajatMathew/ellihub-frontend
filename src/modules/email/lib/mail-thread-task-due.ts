import { differenceInCalendarDays, format } from 'date-fns';

/**
 * How a thread's task says when it is due.
 *
 * The same words the board card uses, so the two never describe one task
 * differently. Unlike the card there is no column heading carrying the date
 * here, so this always speaks when there is a due date to speak about.
 *
 * Counted in calendar days, not hours: a task due at 9am tomorrow is "due
 * tomorrow" whether it is read at midnight or at 8am.
 */
export function mailThreadTaskDueLabel(
  dueAt: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const days = differenceInCalendarDays(due, now);
  if (days < 0) return `overdue ${Math.abs(days)}d`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due ${format(due, 'MMM d')}`;
}

/**
 * Whether the due date has passed, for the row that has to colour it.
 *
 * Its own function rather than sniffing `mailThreadTaskDueLabel` for the word
 * "overdue": the label is prose meant for a reader, and deciding a colour by
 * matching against it would make every future wording change a silent styling
 * bug. Counted the same way the label is, so the two cannot disagree.
 */
export function isMailThreadTaskOverdue(
  dueAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!dueAt) return false;

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return false;

  return differenceInCalendarDays(due, now) < 0;
}
