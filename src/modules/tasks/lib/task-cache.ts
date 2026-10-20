import type {
  ListTasksParams,
  Task,
  TaskBoard,
  TaskBoardParams,
  TaskColumnId,
  TaskPaginatedResponse,
} from '../schemas/task.schema';
import { columnForTask, compareForBoard, TASK_COLUMNS } from './task-board';
import { searchWords, taskMatchesSearch, type SearchableTask } from './task-search';

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
  params: Pick<TaskBoardParams, 'assigneeIds' | 'search'> | undefined,
  task: Pick<Task, 'assigneeId'> & SearchableTask
): boolean {
  // A searched board keeps only tasks the search still finds (elli-ui#1380):
  // a card retitled away from it leaves, as the server would drop it.
  if (!taskMatchesSearch(task, searchWords(params?.search ?? ''))) return false;
  const wanted = params?.assigneeIds ?? [];
  if (wanted.length === 0) return true;
  return task.assigneeId != null && wanted.includes(task.assigneeId);
}

/**
 * Whether a list fetched with these params would have included this task.
 *
 * The one list that matters here is the mail panel's: `accountId` plus the
 * `conversationKey` of the thread it was raised from. A task belongs to it
 * when one of its email references names that same thread in that same
 * mailbox — a conversation key is only unique within a mailbox, so both have
 * to match or a reply in one account would appear under a thread in another.
 *
 * A list asking for neither is the unfiltered list and takes everything. The
 * server-side narrowings a list can also carry — status, priority, assignee —
 * are checked here too, so an optimistic row never lands in a list that would
 * not have returned it.
 */
export function listWantsTask(
  params:
    | Pick<ListTasksParams, 'accountId' | 'conversationKey' | 'status' | 'priority' | 'assigneeId'>
    | undefined,
  task: Pick<Task, 'emailReferences' | 'status' | 'priority' | 'assigneeId'>
): boolean {
  if (!params) return true;
  if (params.status && params.status !== task.status) return false;
  if (params.priority && params.priority !== task.priority) return false;
  if (params.assigneeId && params.assigneeId !== task.assigneeId) return false;

  if (!params.accountId && !params.conversationKey) return true;

  return (task.emailReferences ?? []).some(
    (reference) =>
      (!params.accountId || reference.accountId === params.accountId) &&
      (!params.conversationKey || reference.conversationKey === params.conversationKey)
  );
}

/**
 * Put a task at the top of a cached page.
 *
 * The thread list is sorted newest-first, so a task just raised belongs at the
 * front — which is also where the reader is looking when they press Add. A
 * task already on the page is replaced in place rather than added twice: this
 * is what turns the optimistic row into the server's row when it lands, and
 * keeps a refetch that arrives mid-flight from duplicating it.
 */
export function insertTaskInList(page: TaskPaginatedResponse, task: Task): TaskPaginatedResponse {
  const index = page.data.findIndex((held) => held.id === task.id);
  if (index >= 0) {
    if (page.data[index] === task) return page;
    const data = page.data.slice();
    data[index] = task;
    return { ...page, data };
  }

  return {
    ...page,
    data: [task, ...page.data],
    pagination: { ...page.pagination, totalItems: page.pagination.totalItems + 1 },
  };
}

/**
 * Swap one id for another task, keeping its place.
 *
 * The optimistic row carries a temporary id; the server's row carries the real
 * one. Replacing in place rather than removing and re-inserting means the row
 * does not jump as it is confirmed.
 */
export function replaceTaskInList(
  page: TaskPaginatedResponse,
  id: string,
  task: Task
): TaskPaginatedResponse {
  const index = page.data.findIndex((held) => held.id === id);
  if (index === -1) return insertTaskInList(page, task);

  const data = page.data.slice();
  data[index] = task;
  return { ...page, data };
}

/** Apply a partial change to one task on the page, if it is there. */
export function patchTaskInList(
  page: TaskPaginatedResponse,
  id: string,
  patch: Partial<Task>
): TaskPaginatedResponse {
  const index = page.data.findIndex((held) => held.id === id);
  if (index === -1) return page;

  const data = page.data.slice();
  data[index] = { ...data[index]!, ...patch };
  return { ...page, data };
}

/** Take a task off the page — the optimistic row, when its request failed. */
export function removeTaskFromList(page: TaskPaginatedResponse, id: string): TaskPaginatedResponse {
  const data = page.data.filter((held) => held.id !== id);
  if (data.length === page.data.length) return page;

  return {
    ...page,
    data,
    pagination: { ...page.pagination, totalItems: Math.max(0, page.pagination.totalItems - 1) },
  };
}
