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

/**
 * Flip a task's completion in a cached page.
 *
 * COMPLETED is the one column the board reads off the status rather than the
 * due date, so writing the status here is what moves the card. It happens on
 * the click for the same reason the shift above does: the card has to start
 * leaving while the tick is still under the cursor, or the motion arrives
 * seconds later attached to nothing the user did. See elli-ui#862.
 *
 * `completedAt` is the server's to stamp — it decides the real time and this
 * only needs a truthy value for anything reading "is it done". The refetch
 * replaces it either way.
 *
 * Same by-reference contract as the helpers above: an untouched page comes back
 * as it went in, because the board memoises on the array.
 */
export function setTaskCompletedInList(
  page: TaskPaginatedResponse,
  id: string,
  completed: boolean
): TaskPaginatedResponse {
  let changed = false;

  const data = page.data.map((task): Task => {
    if (task.id !== id) return task;

    const status = completed ? 'COMPLETED' : 'OPEN';
    if (task.status === status) return task;

    changed = true;
    return {
      ...task,
      status,
      completedAt: completed ? new Date().toISOString() : null,
    };
  });

  return changed ? { ...page, data } : page;
}
