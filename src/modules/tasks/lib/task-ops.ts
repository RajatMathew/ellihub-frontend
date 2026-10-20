import type { Task, TaskBoard } from '../schemas/task.schema';
import { patchTaskInBoard, removeTaskFromBoard } from './task-cache';

const VIEWER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * What the person did to the board that the server has not confirmed yet.
 *
 * The board renders the server's answer with these applied on top - see
 * applyOps - and never edits the server's answer itself. Confirming an op is
 * dropping it from the list once its row has been written in; failing one is
 * dropping it and nothing else, since the re-derive is the rollback.
 *
 * Three kinds, by how they queue - see task-outbox:
 *   coalescing  update, shiftDueDate  - last write per field wins, days add up
 *   ordered     reorder               - kept in sequence, never merged
 *   terminal    complete, delete      - sent the moment they happen
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not
 * resolve the `@/` alias.
 */
export type TaskOp =
  | {
      opId: string;
      type: 'update';
      id: string;
      fields: Partial<Pick<Task, 'title' | 'priority' | 'court' | 'assigneeId' | 'dueAt'>>;
      /** For the optimistic card: the id alone cannot draw a name. */
      assignee?: Task['assignee'];
    }
  | { opId: string; type: 'shiftDueDate'; id: string; days: number }
  | {
      opId: string;
      type: 'reorder';
      id: string;
      previousId: string | null;
      nextId: string | null;
      boardOrder: number | null;
      dueAt?: string;
      /** Set when the card left Completed: reopen first, then place. */
      reopen?: boolean;
    }
  | { opId: string; type: 'complete'; id: string; completed: boolean; completedAt: string }
  | {
      opId: string;
      type: 'delete';
      id: string;
      /** For the undo toast: by the time the reply comes the card is gone. */
      title: string;
    };

export type TaskOpKind = 'coalescing' | 'ordered' | 'terminal';

export function opKind(op: TaskOp): TaskOpKind {
  switch (op.type) {
    case 'update':
    case 'shiftDueDate':
      return 'coalescing';
    case 'reorder':
      return 'ordered';
    case 'complete':
    case 'delete':
      return 'terminal';
  }
}

/** The board as the person sees it: the server's, with what they did on top. */
export function applyOps(board: TaskBoard, ops: readonly TaskOp[], now: Date): TaskBoard {
  let next = board;
  for (const op of ops) next = applyOp(next, op, now);
  return next;
}

export function applyOp(board: TaskBoard, op: TaskOp, now: Date): TaskBoard {
  switch (op.type) {
    case 'update': {
      const patch: Partial<Task> = { ...op.fields };
      // A card that changes priority or date has no place in the block it
      // leaves; the server clears its position on the same edit.
      if (op.fields.priority !== undefined || op.fields.dueAt !== undefined) {
        patch.boardOrder = null;
      }
      if (op.assignee !== undefined) patch.assignee = op.assignee;
      return patchTaskInBoard(board, op.id, patch, now);
    }
    case 'shiftDueDate': {
      const held = findTask(board, op.id);
      // No date means no column to move between, and inventing one would put
      // the task somewhere the server never agreed to.
      if (!held?.dueAt) return board;
      const dueAt = new Date(held.dueAt);
      dueAt.setDate(dueAt.getDate() + op.days);
      return patchTaskInBoard(board, op.id, { dueAt: dueAt.toISOString(), boardOrder: null }, now);
    }
    case 'reorder':
      return patchTaskInBoard(
        board,
        op.id,
        {
          boardOrder: op.boardOrder,
          ...(op.dueAt !== undefined && { dueAt: op.dueAt, dueHasTime: false }),
          ...(op.reopen && { status: 'OPEN', completedAt: null }),
        },
        now
      );
    case 'complete':
      return patchTaskInBoard(
        board,
        op.id,
        {
          status: op.completed ? 'COMPLETED' : 'OPEN',
          completedAt: op.completed ? op.completedAt : null,
          boardOrder: null,
        },
        now
      );
    case 'delete':
      return removeTaskFromBoard(board, op.id);
  }
}

function findTask(board: TaskBoard, id: string): Task | undefined {
  for (const column of Object.values(board.columns)) {
    const task = column.tasks.find((task) => task.id === id);
    if (task) return task;
  }
  return undefined;
}

/** The op as the server takes it: type, id and fields, no client-side extras. */
export function toWire(op: TaskOp): Record<string, unknown> {
  switch (op.type) {
    case 'update':
      return { opId: op.opId, type: op.type, id: op.id, ...op.fields };
    case 'shiftDueDate':
      // Days are counted on the viewer's calendar, as the optimistic move above
      // does, so the server lands the card in the same column.
      return { opId: op.opId, type: op.type, id: op.id, days: op.days, tz: VIEWER_TIME_ZONE };
    case 'reorder':
      return {
        opId: op.opId,
        type: op.type,
        id: op.id,
        previousId: op.previousId,
        nextId: op.nextId,
        ...(op.dueAt !== undefined && { dueAt: op.dueAt, dueHasTime: false }),
      };
    case 'complete':
      return { opId: op.opId, type: op.type, id: op.id, completed: op.completed };
    case 'delete':
      return { opId: op.opId, type: op.type, id: op.id };
  }
}
