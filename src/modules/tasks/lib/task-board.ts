import type { Task } from '@/modules/tasks/schemas/task.schema';
import { endOfWeek, isBefore, isSameDay, startOfDay } from 'date-fns';

export const TASK_COLUMNS = [
  // TEMPORARILY DISABLED — the due date is required now, so nothing should be
  // undated. To bring the column back, uncomment this entry together with its
  // label, its tone, the columnForTask branch and the canMoveTask rule below,
  // and restore the required rule on `dueDate` in schemas/task.schema.ts.
  // 'NO_DATE',
  'OVERDUE',
  'DUE_TODAY',
  'TOMORROW',
  'PENDING',
  'COMPLETED',
] as const;

export type TaskColumnId = (typeof TASK_COLUMNS)[number];

export const TASK_COLUMN_LABELS: Record<TaskColumnId, string> = {
  // NO_DATE: 'No due date',
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due Today',
  TOMORROW: 'Tomorrow',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
};

// Dot colour per column, from the design's own palette rather than raw hexes.
export const TASK_COLUMN_TONES: Record<TaskColumnId, string> = {
  // NO_DATE: 'bg-muted-foreground',
  OVERDUE: 'bg-destructive',
  DUE_TODAY: 'bg-warning',
  TOMORROW: 'bg-primary',
  PENDING: 'bg-primary',
  COMPLETED: 'bg-success',
};

/**
 * Which column a task belongs in.
 *
 * Only COMPLETED is a stored status. Every other column is *derived* from the
 * due date, which is what makes some drags impossible — see canMoveTask.
 */
export function columnForTask(task: Task, now: Date = new Date()): TaskColumnId {
  if (task.status === 'COMPLETED') return 'COMPLETED';
  // if (!task.dueAt) return 'NO_DATE';
  // With the column disabled a dateless task has nowhere of its own to go. The
  // create form requires a date and the existing ones were backfilled, so this
  // should not fire — but the board must not fall over on one that slips past
  // the API. Overdue is where it surfaces until someone gives it a date.
  if (!task.dueAt) return 'OVERDUE';

  const due = new Date(task.dueAt);
  const today = startOfDay(now);
  const tomorrow = startOfDay(new Date(now.getTime() + 86_400_000));

  if (isBefore(startOfDay(due), today)) return 'OVERDUE';
  if (isSameDay(due, today)) return 'DUE_TODAY';
  if (isSameDay(due, tomorrow)) return 'TOMORROW';
  // Everything else is dated but not imminent. The column does not narrow to a
  // week: a task due in a month still has a deadline, so it belongs with the
  // dated work rather than in the undated column. The card carries the exact
  // date, which is what tells the two apart.
  return 'PENDING';
}

export function groupTasksByColumn(
  tasks: Task[],
  now: Date = new Date()
): Record<TaskColumnId, Task[]> {
  const groups = Object.fromEntries(TASK_COLUMNS.map((id) => [id, [] as Task[]])) as Record<
    TaskColumnId,
    Task[]
  >;

  for (const task of tasks) groups[columnForTask(task, now)].push(task);

  // "Worst first": P1 above P3, and within a priority the nearer deadline wins.
  for (const id of TASK_COLUMNS) {
    groups[id].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }

  return groups;
}

/**
 * What the board's arrangement depends on, as a string.
 *
 * The board mirrors the grouping into local state so cards can slide apart under
 * a dragged one, and re-seeds when this changes. It covers exactly what decides
 * which column a card is in and where it sits: membership, status, due date and
 * priority. Card *content* is deliberately absent — the board reads that from
 * the server data at render, so a retitled card needs no re-seed.
 */
export function boardArrangementSignature(tasks: Task[]): string {
  return tasks
    .map((task) => `${task.id}:${task.status}:${task.dueAt ?? ''}:${task.priority}`)
    .join('|');
}

/**
 * Whether a card may be dragged from one column to another, and why not.
 *
 * The rules follow from the columns being derived rather than chosen:
 *
 * - Nothing may be dropped INTO Overdue. Lateness is a fact about the past; you
 *   cannot make a task late by dragging it.
 * - An overdue task may only be completed. Dragging it to Due Today would mean
 *   quietly rewriting its deadline so it no longer looks late — the ticket calls
 *   this out explicitly.
 * - Nothing may be dropped into No due date, because that would silently discard
 *   a deadline. Clearing one is an edit, so it belongs in the dialog. (That
 *   column is currently disabled, so the rule below is commented out with it.)
 */
export function canMoveTask(
  from: TaskColumnId,
  to: TaskColumnId
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: true };

  if (to === 'OVERDUE') {
    return {
      allowed: false,
      reason: 'A task becomes overdue by its due date passing, not by hand',
    };
  }

  // if (to === 'NO_DATE') {
  //   return { allowed: false, reason: 'Clear the due date from the task itself to remove it' };
  // }

  if (from === 'OVERDUE' && to !== 'COMPLETED') {
    return {
      allowed: false,
      reason: 'An overdue task can only be completed, not rescheduled here',
    };
  }

  return { allowed: true };
}

/**
 * The due date a column implies, used when a drop reschedules a task.
 * Returns null for columns that do not set one.
 */
export function dueDateForColumn(column: TaskColumnId, now: Date = new Date()): Date | null {
  const day = 86_400_000;

  switch (column) {
    case 'DUE_TODAY':
      return startOfDay(now);
    case 'TOMORROW':
      return startOfDay(new Date(now.getTime() + day));
    // End of the current week, but never nearer than the day after tomorrow: on
    // a Saturday end-of-week IS tomorrow and on a Sunday it is today, and a card
    // given either of those dates would bounce straight back out of Pending.
    case 'PENDING': {
      const endOfThisWeek = startOfDay(endOfWeek(now, { weekStartsOn: 1 }));
      const dayAfterTomorrow = startOfDay(new Date(now.getTime() + 2 * day));
      return endOfThisWeek > dayAfterTomorrow ? endOfThisWeek : dayAfterTomorrow;
    }
    default:
      return null;
  }
}
