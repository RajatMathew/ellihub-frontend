import type { CreateTaskInput, Task } from '../schemas/task.schema';

/**
 * The task a create draws before the server has answered.
 *
 * Adding a task used to hold its form open on "Adding…" for the whole round
 * trip, and the row only appeared once the list had been refetched after that
 * (elli-ui#1125). Everything the row shows — title, priority, court, due date,
 * who holds it — is already in the payload being sent, so there is nothing to
 * wait for: the row is drawn from the input and reconciled with the server's
 * copy when it lands.
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not
 * resolve the `@/` alias.
 */

/**
 * Marks a row the server has never seen. The prefix is a word no server id can
 * be — ids are ULIDs — so a check against it can never catch a real one, and
 * `crypto.randomUUID` keeps two rapid creates from sharing a row.
 */
const OPTIMISTIC_TASK_ID_PREFIX = 'optimistic-task-';

export function newOptimisticTaskId(): string {
  return `${OPTIMISTIC_TASK_ID_PREFIX}${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }`;
}

/**
 * Whether this is a row still in flight.
 *
 * The one thing a caller must not do to an optimistic row is send its id back
 * to the server — ticking it off, or opening it to edit, would address a task
 * that does not exist yet. Callers check this and leave the row alone for the
 * moment it takes to be confirmed.
 */
export function isOptimisticTaskId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_TASK_ID_PREFIX);
}

/**
 * The payload as the row the cache will hold.
 *
 * `status` is what decides the board column and the tick state, and a new task
 * is always open. `boardOrder` is null — nobody has placed it, so it sorts by
 * age like any unplaced card, which is where the server will put it too.
 */
export function buildOptimisticTask(
  input: CreateTaskInput,
  { id, now, assignee }: { id: string; now: Date; assignee?: Task['assignee'] }
): Task {
  const timestamp = now.toISOString();

  return {
    id,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    status: 'OPEN',
    court: input.court,
    dueAt: input.dueAt ?? null,
    dueHasTime: input.dueHasTime ?? false,
    completedAt: null,
    assigneeId: input.assigneeId ?? null,
    // Only what the client already knows. A picker hands over an id, and the
    // name beside it is looked up from a board that is already loaded; with no
    // board open there is no name to show, and the row simply carries none
    // until the server's copy arrives a moment later.
    assignee: assignee ?? null,
    entityLinks: input.entityLinks ?? [],
    emailReferences: input.emailReferences ?? [],
    boardOrder: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
