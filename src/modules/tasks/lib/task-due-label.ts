import { differenceInCalendarDays, format } from 'date-fns';

/** How the foot of a task card colours its deadline pill. */
export type TaskDueTone = 'overdue' | 'today' | 'tomorrow' | 'later';

/**
 * What the card says about the deadline.
 *
 * Near dates are named rather than dated — "Due today" beats "Wed, Sep 3" on a
 * card sitting in a column headed "Due Today, Sep 3", where the date is already
 * on screen. Only dates far enough out to be genuinely ambiguous get written.
 */
export function taskDueLabel(
  dueAt: string | null | undefined,
  now: Date
): { text: string; tone: TaskDueTone } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const days = differenceInCalendarDays(due, now);
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'today' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'tomorrow' };
  return { text: format(due, 'MMM d'), tone: 'later' };
}

/** The pill's surface and ink for each tone — theme tokens, so dark mode follows. */
export const TASK_DUE_TONE_CLASSES: Record<TaskDueTone, string> = {
  overdue: 'bg-destructive-soft text-destructive-soft-foreground',
  today: 'bg-warning-soft text-warning-soft-foreground',
  tomorrow: 'bg-info-soft text-info-soft-foreground',
  later: 'bg-task-chip text-task-ink-soft',
};
