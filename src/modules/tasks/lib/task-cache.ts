import type { Task, TaskBoard, TaskBoardParams, TaskColumnId } from '../schemas/task.schema';
import { columnForTask, compareForBoard, TASK_COLUMNS } from './task-board';

/**
 * Edits to the board held in the query cache.
 *
 * The board is not refetched after every action any more. Each write returns
 * the task it changed, and that is put straight into the cached board; the
 * same helpers apply the change *before* the request goes out, so a card moves
 * on the click rather than a round trip later. Every helper returns the board
 * unchanged, by reference, when nothing moved - the board memoises on the
 * columns, and a fresh object for no change would re-render every card.
 *
 * A task's column is worked out here the way the server works it out: by
 * status, then by due date against `now`. The server's cut and this one can
 * only disagree across midnight, and the board refetches when the day turns.
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not
 * resolve the `@/` alias.
 */

/** Which column holds the task, or null if the board does not have it. */
export function columnOf(board: TaskBoard, id: string): TaskColumnId | null {
  for (const column of TASK_COLUMNS) {
    if (board.columns[column].tasks.some((task) => task.id === id)) return column;
  }
  return null;
}

/** The task as the board holds it, or undefined. */
export function findInBoard(board: TaskBoard, id: string): Task | undefined {
  for (const column of TASK_COLUMNS) {
    const task = board.columns[column].tasks.find((task) => task.id === id);
    if (task) return task;
  }
  return undefined;
}

/**
 * Put a task on the board where it now belongs.
 *
 * Handles every case one helper can: a new task (the column gains it), a
 * changed one (it is re-sorted in place), and one whose status or date moved
 * it (the old column loses it, the new one gains it). Totals follow the cards,
 * so a capped column stays honest about what it holds.
 */
export function upsertTaskInBoard(board: TaskBoard, task: Task, now: Date): TaskBoard {
  const from = columnOf(board, task.id);
  const to = columnForTask(task, now);

  if (from === to) {
    const column = board.columns[to];
    const index = column.tasks.findIndex((held) => held.id === task.id);
    const tasks = column.tasks.slice();
    tasks.splice(index, 1);
    insertSorted(tasks, task);

    // Same content in the same slot is no change at all.
    const before = column.tasks[index];
    if (before === task && tasks[index] === task) return board;

    return withColumn(board, to, { tasks, total: column.total });
  }

  let next = board;
  if (from) {
    const column = next.columns[from];
    next = withColumn(next, from, {
      tasks: column.tasks.filter((held) => held.id !== task.id),
      total: Math.max(0, column.total - 1),
    });
  }

  const column = next.columns[to];
  const tasks = column.tasks.slice();
  insertSorted(tasks, task);
  return withColumn(next, to, { tasks, total: column.total + 1 });
}

/** Take a task off the board, wherever it is. */
export function removeTaskFromBoard(board: TaskBoard, id: string): TaskBoard {
  const from = columnOf(board, id);
  if (!from) return board;

  const column = board.columns[from];
  return withColumn(board, from, {
    tasks: column.tasks.filter((task) => task.id !== id),
    total: Math.max(0, column.total - 1),
  });
}

/**
 * Change some fields of a task the board holds, and re-place it.
 *
 * The optimistic path: the request has not gone out yet, so only what the
 * caller knows is written. A task the board does not hold is left alone -
 * there is nothing to show the change on.
 */
export function patchTaskInBoard(
  board: TaskBoard,
  id: string,
  patch: Partial<Task>,
  now: Date
): TaskBoard {
  const held = findInBoard(board, id);
  if (!held) return board;

  const changed = (Object.keys(patch) as (keyof Task)[]).some(
    (key) => !Object.is(held[key], patch[key])
  );
  if (!changed) return board;

  return upsertTaskInBoard(board, { ...held, ...patch }, now);
}

/** Every task on the board, column order then board order. */
export function boardTasks(board: TaskBoard): Task[] {
  return TASK_COLUMNS.flatMap((column) => board.columns[column].tasks);
}

function insertSorted(tasks: Task[], task: Task) {
  let index = 0;
  while (index < tasks.length && compareForBoard(tasks[index], task) < 0) index += 1;
  tasks.splice(index, 0, task);
}

function withColumn(
  board: TaskBoard,
  column: TaskColumnId,
  value: TaskBoard['columns'][TaskColumnId]
): TaskBoard {
  return { ...board, columns: { ...board.columns, [column]: value } };
}

/**
 * Whether a board fetched with these params would have included this task.
 *
 * A board is filtered to a set of people, or to nobody in particular. A task
 * written into the cache goes onto every board that would show it and comes
 * off every board that would not - so a card handed to somebody outside the
 * filter leaves the filtered board rather than lingering on it. An unassigned
 * task is on nobody's filtered board.
 */
export function boardWantsTask(
  params: Pick<TaskBoardParams, 'assigneeIds'> | undefined,
  task: Pick<Task, 'assigneeId'>
): boolean {
  const wanted = params?.assigneeIds ?? [];
  if (wanted.length === 0) return true;
  return task.assigneeId != null && wanted.includes(task.assigneeId);
}
