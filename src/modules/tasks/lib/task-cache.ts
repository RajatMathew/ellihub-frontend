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
    return { ...task, dueAt: dueAt.toISOString() };
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
