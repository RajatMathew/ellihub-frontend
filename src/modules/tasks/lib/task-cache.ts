import type { Task, TaskPaginatedResponse } from '@/modules/tasks/schemas/task.schema';

/**
 * Apply a due-date shift to a cached page of tasks.
 *
 * The board groups by due date, so writing the new date into the cache is what
 * moves the card — the point being that it happens on the click rather than a
 * round trip later. The server's answer replaces this when it arrives.
 *
 * Returns the page unchanged, by reference, when nothing moved: the board
 * memoises on the array, so a fresh one would re-render every card on an
 * unrelated task's shift.
 */
export function shiftTaskDueDateInList(
  page: TaskPaginatedResponse,
  id: string,
  days: number
): TaskPaginatedResponse {
  let changed = false;

  const data = page.data.map((task): Task => {
    // No date means no column to move between, and inventing one would put the
    // task somewhere the server never agreed to.
    if (task.id !== id || !task.dueAt) return task;

    const dueAt = new Date(task.dueAt);
    dueAt.setDate(dueAt.getDate() + days);
    changed = true;
    // The card is landing in another column, where its hand-placed position in
    // the old one means nothing. The server clears it on the same edit; doing it
    // here too is what stops the card settling in one slot and then jumping to
    // another when the response arrives.
    return { ...task, dueAt: dueAt.toISOString(), boardOrder: null };
  });

  return changed ? { ...page, data } : page;
}

/**
 * Drop a task from a cached page.
 *
 * The card has to leave the board on the click, not a round trip later — the
 * Undo toast that follows only makes sense once the thing it undoes has visibly
 * happened. The delete is soft on the server, so this is the only place the task
 * actually disappears from; a failure puts the page back.
 *
 * Same by-reference contract as the shift above: an untouched page is returned
 * as it came in, because the board memoises on the array.
 */
export function removeTaskFromList(page: TaskPaginatedResponse, id: string): TaskPaginatedResponse {
  const data = page.data.filter((task) => task.id !== id);
  if (data.length === page.data.length) return page;

  return {
    ...page,
    data,
    // The header counts tasks off this number, so leaving it alone would show a
    // count one higher than the cards under it until the refetch lands.
    pagination: {
      ...page.pagination,
      totalItems: Math.max(0, page.pagination.totalItems - 1),
    },
  };
}

/**
 * Write a hand-placed position into a cached page, and the new due date with it
 * when the card was dragged in from another column.
 *
 * The board sorts on `boardOrder`, so this is what moves the card on release —
 * the drag itself does not reorder anything. The value is the one the server
 * will settle on (see dropBoardOrder), so the response replaces it with itself
 * rather than moving the card a second time.
 *
 * The two go together deliberately. Applied separately the card would land in
 * its new column by age and then move again when the response arrived, which is
 * the jump this whole path exists to avoid.
 *
 * Same by-reference contract as the helpers above: a page that does not hold
 * the task comes back exactly as it came in, because the board memoises on the
 * array.
 */
export function placeTaskInList(
  page: TaskPaginatedResponse,
  id: string,
  boardOrder: number | null,
  dueAt?: string
): TaskPaginatedResponse {
  let changed = false;

  const data = page.data.map((task): Task => {
    if (task.id !== id) return task;
    changed = true;
    return { ...task, boardOrder, ...(dueAt !== undefined && { dueAt }) };
  });

  return changed ? { ...page, data } : page;
}
