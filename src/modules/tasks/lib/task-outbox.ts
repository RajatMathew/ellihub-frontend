import type { Task, TaskBatchResult, TaskBoard, TaskBoardParams } from '../schemas/task.schema';
import { boardWantsTask, removeTaskFromBoard, upsertTaskInBoard } from './task-cache';
import { opKind, type TaskOp } from './task-ops';

/**
 * The queue between the board and the network.
 *
 * The screen updates in the gesture's own frame - see applyOps - and only the
 * network batches. These are the rules for what goes in the queue, and in
 * what order it goes out; the React hook around it owns the timers and the
 * requests.
 *
 * Order is the person's order. The server applies a batch in sequence, and
 * for a card that was dragged and then re-prioritised - or the reverse - the
 * sequence is the meaning: a drag names neighbours in the block the card was
 * in when it was dragged. So an op only ever merges into an earlier op on the
 * same card when nothing in between changed that card's place.
 */

/** Flush this long after the last op, if nothing else forced it sooner. */
export const OUTBOX_IDLE_MS = 400;
/** Flush when this many ops are waiting, idle or not. */
export const OUTBOX_MAX_OPS = 10;

/**
 * Add an op, merging it into an earlier one where that means the same thing.
 *
 * Field edits on one card collapse to one op with the last value per field;
 * two +1 days become +2. A merge never reaches past a reorder, complete or
 * delete of the same card, and never touches an op that is already on the
 * wire - `inFlight` - since its shape was sent.
 */
export function enqueue(
  pending: readonly TaskOp[],
  op: TaskOp,
  inFlight: ReadonlySet<string>
): TaskOp[] {
  if (opKind(op) === 'coalescing') {
    const target = mergeTarget(pending, op, inFlight);
    if (target !== -1) {
      const merged = merge(pending[target], op);
      return pending.map((held, index) => (index === target ? merged : held));
    }
  }

  // A delete makes every unsent op on the card moot. Dropping them keeps the
  // batch from writing to a row it is about to remove and the toasts quiet.
  if (op.type === 'delete') {
    return [...pending.filter((held) => held.id !== op.id || inFlight.has(held.opId)), op];
  }

  return [...pending, op];
}

function mergeTarget(
  pending: readonly TaskOp[],
  op: TaskOp,
  inFlight: ReadonlySet<string>
): number {
  for (let index = pending.length - 1; index >= 0; index -= 1) {
    const held = pending[index];
    if (held.id !== op.id) continue;
    if (inFlight.has(held.opId)) return -1;
    if (held.type === op.type) return index;
    // Anything else on the same card - a drag, a tick, the other coalescing
    // type - fixes the order; nothing merges across it.
    return -1;
  }
  return -1;
}

function merge(into: TaskOp, op: TaskOp): TaskOp {
  if (into.type === 'update' && op.type === 'update') {
    return {
      ...into,
      fields: { ...into.fields, ...op.fields },
      ...(op.assignee !== undefined && { assignee: op.assignee }),
    };
  }
  if (into.type === 'shiftDueDate' && op.type === 'shiftDueDate') {
    return { ...into, days: into.days + op.days };
  }
  return op;
}

/** Whether this op should go out now rather than after the idle wait. */
export function flushesNow(op: TaskOp): boolean {
  return opKind(op) === 'terminal';
}

/** The ops to send next: everything waiting, in order, nothing already sent. */
export function nextBatch(pending: readonly TaskOp[], inFlight: ReadonlySet<string>): TaskOp[] {
  return pending.filter((op) => !inFlight.has(op.opId));
}

export interface OpResult {
  opId: string;
  ok: boolean;
  error?: { message: string; status: number };
}

/**
 * What a batch's reply does to the queue: every op it answered leaves,
 * whether it landed or was refused. A refused op has nothing to roll back -
 * the board is re-derived from the server's rows without it.
 */
export function settle(
  pending: readonly TaskOp[],
  results: readonly OpResult[]
): {
  pending: TaskOp[];
  confirmed: TaskOp[];
  failed: { op: TaskOp; error: OpResult['error'] }[];
} {
  const answered = new Map(results.map((result) => [result.opId, result]));
  const confirmed: TaskOp[] = [];
  const failed: { op: TaskOp; error: OpResult['error'] }[] = [];
  const remaining: TaskOp[] = [];

  for (const op of pending) {
    const result = answered.get(op.opId);
    if (!result) remaining.push(op);
    else if (result.ok) confirmed.push(op);
    else failed.push({ op, error: result.error });
  }

  return { pending: remaining, confirmed, failed };
}

/** The rows a batch's reply carries: each landed op's own task and any it re-spaced. */
export function replyRows(results: readonly TaskBatchResult[]): Task[] {
  return results.flatMap((result) =>
    result.ok ? [...result.touched, ...(result.task ? [result.task] : [])] : []
  );
}

/**
 * A cached board once a batch's reply has landed: its rows written in, and the
 * tasks it confirmed deleted taken out.
 *
 * The board draws the server's rows with the pending ops on top, so a deleted
 * card is hidden only while its delete op is pending. The server answers a
 * delete with no row, so once the op was settled nothing hid the card and the
 * board drew it again until a reload. The row has to leave here, in the same
 * write that retires the op.
 *
 * A row the board's filter does not want - a task handed to someone else -
 * leaves that board rather than being written in.
 */
export function applyBatchReply(
  board: TaskBoard,
  params: Pick<TaskBoardParams, 'assigneeIds'> | undefined,
  results: readonly TaskBatchResult[],
  confirmed: readonly TaskOp[],
  now: Date
): TaskBoard {
  let next = board;
  for (const row of replyRows(results)) {
    next = boardWantsTask(params, row)
      ? upsertTaskInBoard(next, row, now)
      : removeTaskFromBoard(next, row.id);
  }
  for (const op of confirmed) {
    if (op.type === 'delete') next = removeTaskFromBoard(next, op.id);
  }
  return next;
}
