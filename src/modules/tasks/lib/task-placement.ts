import type { Task } from '../schemas/task.schema';

/** The two calls a placement can need, handed in so this stays testable. */
export interface PlacementApi {
  setCompleted(id: string, completed: boolean): Promise<Task>;
  reorder(
    id: string,
    previousId: string | null,
    nextId: string | null,
    dueAt?: string
  ): Promise<Task>;
}

export interface PlacementRequest {
  id: string;
  previousId: string | null;
  nextId: string | null;
  dueAt?: string;
  reopen?: boolean;
}

/**
 * Put a card where it was dropped, reopening it first when it left Completed.
 *
 * Strictly in that order. Sent together the two raced, and a placement that
 * reached the server first was refused for putting a completed card among
 * open ones — leaving the card reopened on its old date, in Overdue.
 *
 * If the reopen fails nothing else is sent. If the placement fails after a
 * reopen, the reopen is undone so the card is back where it started rather
 * than half-moved; the undo is best effort and the original error is what
 * surfaces either way.
 *
 * Relative imports on purpose: exercised by a bun test, and bun does not
 * resolve the `@/` alias.
 */
export async function placeTask(api: PlacementApi, request: PlacementRequest): Promise<Task> {
  const { id, previousId, nextId, dueAt, reopen } = request;

  if (reopen) await api.setCompleted(id, false);

  try {
    return await api.reorder(id, previousId, nextId, dueAt);
  } catch (error: unknown) {
    if (reopen) await api.setCompleted(id, true).catch(() => undefined);
    throw error;
  }
}
