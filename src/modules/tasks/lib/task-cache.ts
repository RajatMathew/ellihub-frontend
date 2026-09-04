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
