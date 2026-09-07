import type { Task } from '@/modules/tasks/schemas/task.schema';
import { endOfWeek, format, isBefore, isSameDay, startOfDay } from 'date-fns';

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
/**
 * The heading a column shows.
 *
 * "Due Today" and "Tomorrow" name a day without saying which, so the design puts
 * the date beside them - it is the one place the board states what "today" is,
 * and a board left open overnight would otherwise lie silently. The dated
 * columns further out do not get one: Pending spans a range, and Overdue and
 * Completed are about the past.
 */
export function columnHeading(column: TaskColumnId, now: Date = new Date()): string {
  const label = TASK_COLUMN_LABELS[column];

  if (column === 'DUE_TODAY') return `${label}, ${format(now, 'MMM d')}`;
  if (column === 'TOMORROW') {
    return `${label}, ${format(new Date(now.getTime() + 86_400_000), 'MMM d')}`;
  }

  return label;
}

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

  for (const id of TASK_COLUMNS) groups[id].sort(compareForBoard);

  return groups;
}

/**
 * What decides a card's place inside its priority block.
 *
 * `boardOrder` is where someone dragged the card to; null means nobody has, and
 * the card sorts by when it was made. Seeding the fallback from creation time
 * rather than treating null as a separate case is what keeps this one number:
 * an untouched card and a hand-placed one are compared the same way, and a card
 * created now lands at the bottom of its block because "now" is the largest
 * value in play.
 *
 * It also makes the reset trivial. A card whose column or priority changed has
 * no meaningful position in the block it arrives in, so the server clears
 * `boardOrder` and the card falls back to its age — which is exactly what
 * elli-ui#791 asks for when a card is moved by the +N day button.
 */
export function taskOrderKey(task: Task): number {
  return task.boardOrder ?? new Date(task.createdAt).getTime();
}

/**
 * "Worst first": P1 above P3, and within one priority the oldest card on top.
 *
 * Deliberately not tie-broken on the due date. Inside a column every card
 * shares a due *day*, so comparing due dates decided nothing and left the order
 * to however the rows arrived — the swapped cards elli-ui#791 reports. Pending
 * is the one column whose dates genuinely differ, and it follows the same rule
 * anyway: one ordering for the whole board is what makes it predictable.
 */
function compareForBoard(a: Task, b: Task): number {
  if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
  return taskOrderKey(a) - taskOrderKey(b);
}

/**
 * The slot a dragged card may actually land in, given where it is aimed.
 *
 * Priority outranks hand-placement, so a card can only be moved within the run
 * of cards that share its priority. Rather than refusing an out-of-block drop,
 * the aim is pinned to the nearest end of the block: the drop indicator then
 * only ever appears somewhere legal, so there is no rejection to explain.
 *
 * `column` is the column as rendered, including the dragged card. The returned
 * index is an insertion point into the column *without* it, which is what
 * dropNeighbours expects.
 */
export function resolveDropIndex(column: Task[], activeId: string, proposedIndex: number): number {
  const active = column.find((task) => task.id === activeId);
  const others = column.filter((task) => task.id !== activeId);
  if (!active) return Math.max(0, Math.min(proposedIndex, others.length));

  const first = others.findIndex((task) => task.priority === active.priority);

  // No card of this priority left to sit among: the block is empty and sits
  // immediately after every higher-priority card, which is its only legal slot.
  if (first === -1) {
    const start = others.filter((task) => task.priority < active.priority).length;
    return start;
  }

  let last = first;
  while (last + 1 < others.length && others[last + 1].priority === active.priority) last += 1;

  return Math.max(first, Math.min(proposedIndex, last + 1));
}

/**
 * The two cards a drop lands between, named for the server.
 *
 * Sending neighbours rather than an index means the server does not have to
 * agree with the browser about what the column contained — it only has to place
 * the card between two rows it can look up itself.
 */
export function dropNeighbours(
  column: Task[],
  activeId: string,
  index: number
): { previousId: string | null; nextId: string | null } {
  const { previous, next } = neighboursAt(column, activeId, index);

  return {
    previousId: previous?.id ?? null,
    nextId: next?.id ?? null,
  };
}

/**
 * The cards either side of a slot, counting only the dragged card's own
 * priority block.
 *
 * Clamping the index is not enough on its own. At the top of the P3s the card
 * immediately above the slot is a P1, and naming it as the previous neighbour
 * is a request the server refuses — priority outranks hand-placement there too,
 * so the drop came back 400 and silently did nothing. The ends of a block have
 * no neighbour, which is exactly what null means here.
 */
function neighboursAt(
  column: Task[],
  activeId: string,
  index: number
): { previous?: Task; next?: Task } {
  const active = column.find((task) => task.id === activeId);
  const others = column.filter((task) => task.id !== activeId);
  const inBlock = (task?: Task) =>
    task && active && task.priority === active.priority ? task : undefined;

  return { previous: inBlock(others[index - 1]), next: inBlock(others[index]) };
}

/**
 * Whether a drop at this slot would actually move the card.
 *
 * A resolved slot equal to the card's own position means it lands back where it
 * started. That happens more often than it sounds: the clamp does it every time
 * a card already at the top of its block is aimed higher. Nothing should be
 * drawn or saved for it — an indicator would promise a move that is not coming,
 * and the write would be a round trip to set the position it already has.
 */
export function dropMovesTask(column: Task[], activeId: string, index: number): boolean {
  const activeIndex = column.findIndex((task) => task.id === activeId);
  return activeIndex !== -1 && index !== activeIndex;
}

/** A minute, in the milliseconds an order key is measured in. Matches the server. */
const BOARD_ORDER_STEP = 60_000;

/**
 * The order key a drop should show straight away, before the server answers.
 *
 * Deliberately the same arithmetic the service does — halfway between the two
 * neighbours, or a step past the only one — because a different guess would
 * settle the card in one place and then move it again when the response lands.
 * Null when there is nothing to sit between, which is not a position at all.
 */
export function dropBoardOrder(column: Task[], activeId: string, index: number): number | null {
  const { previous, next } = neighboursAt(column, activeId, index);

  if (previous && next) return (taskOrderKey(previous) + taskOrderKey(next)) / 2;
  if (previous) return taskOrderKey(previous) + BOARD_ORDER_STEP;
  if (next) return taskOrderKey(next) - BOARD_ORDER_STEP;
  return null;
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
    .map(
      (task) =>
        `${task.id}:${task.status}:${task.dueAt ?? ''}:${task.priority}:${task.boardOrder ?? ''}`
    )
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
