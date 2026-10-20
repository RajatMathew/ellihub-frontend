import { describe, expect, test } from 'bun:test';

import { upsertTaskInBoard } from '../src/modules/tasks/lib/task-cache';
import { applyOps, type TaskOp } from '../src/modules/tasks/lib/task-ops';
import { applyBatchReply, settle } from '../src/modules/tasks/lib/task-outbox';
import type { Task, TaskBatchResult, TaskBoard } from '../src/modules/tasks/schemas/task.schema';

/**
 * A confirmed delete takes the card off the board.
 *
 * The board draws the server's rows with the pending ops on top, so a deleted
 * card is hidden only while its delete op is pending. The server answers a
 * delete with `task: null` and nothing touched, so the reply wrote no row -
 * and once the op was settled nothing hid the card any more: the board drew it
 * again ("1 task") until a reload, although the server had deleted it.
 */
const now = new Date(2026, 8, 16, 9);

const task = (over: Partial<Task>): Task =>
  ({
    id: 'a',
    title: 'Chase the rebar invoice',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: new Date(2026, 8, 16, 17).toISOString(),
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  }) as Task;

const board = (tasks: Task[]): TaskBoard => ({
  today: '2026-09-16',
  people: [],
  columns: {
    OVERDUE: { tasks: [], total: 0 },
    DUE_TODAY: { tasks, total: tasks.length },
    TOMORROW: { tasks: [], total: 0 },
    PENDING: { tasks: [], total: 0 },
    COMPLETED: { tasks: [], total: 0 },
  },
});

const ids = (b: TaskBoard) =>
  Object.values(b.columns).flatMap((column) => column.tasks.map((t) => t.id));
const total = (b: TaskBoard) => Object.values(b.columns).reduce((sum, c) => sum + c.total, 0);

const deleteOp: TaskOp = {
  opId: 'op-1',
  type: 'delete',
  id: 'a',
  title: 'Chase the rebar invoice',
};
// What PATCH /task/batch answers for a delete.
const deleted: TaskBatchResult = {
  opId: 'op-1',
  ok: true,
  type: 'delete',
  task: null,
  touched: [],
};

/** The board as drawn after a reply: server rows written, then what is still pending. */
function drawnAfterReply(server: TaskBoard, pending: TaskOp[], results: TaskBatchResult[]) {
  const { pending: remaining, confirmed } = settle(pending, results);
  const written = applyBatchReply(server, undefined, results, confirmed, now);
  return applyOps(written, remaining, now);
}

describe('settling a delete', () => {
  test('the card is hidden while the delete is pending', () => {
    const server = board([task({ id: 'a' }), task({ id: 'b' })]);

    expect(ids(applyOps(server, [deleteOp], now))).toEqual(['b']);
  });

  test('a confirmed delete leaves the board, and the column count drops', () => {
    const server = board([task({ id: 'a' }), task({ id: 'b' })]);

    const drawn = drawnAfterReply(server, [deleteOp], [deleted]);

    expect(ids(drawn)).toEqual(['b']);
    expect(total(drawn)).toBe(1);
  });

  test('a refused delete puts the card back', () => {
    const server = board([task({ id: 'a' })]);
    const refused: TaskBatchResult = {
      opId: 'op-1',
      ok: false,
      type: 'delete',
      error: { message: 'Missing task:delete', status: 403 },
    };

    expect(ids(drawnAfterReply(server, [deleteOp], [refused]))).toEqual(['a']);
  });

  test('a delete not yet answered stays pending and hidden', () => {
    const server = board([task({ id: 'a' })]);

    expect(ids(drawnAfterReply(server, [deleteOp], []))).toEqual([]);
    expect(ids(server)).toEqual(['a']);
  });

  test('Undo writes the restored row back in', () => {
    const server = board([task({ id: 'b' })]);
    const afterDelete = drawnAfterReply(server, [deleteOp], [deleted]);

    // useRestoreTaskMutation writes the row PATCH /task/restore answers with.
    const restored = upsertTaskInBoard(afterDelete, task({ id: 'a' }), now);

    expect(ids(restored).sort()).toEqual(['a', 'b']);
  });

  test('rows a reply carries are still written in', () => {
    const server = board([task({ id: 'a', priority: 'P3' })]);
    const update: TaskOp = { opId: 'op-2', type: 'update', id: 'a', fields: { priority: 'P1' } };
    const updated: TaskBatchResult = {
      opId: 'op-2',
      ok: true,
      type: 'update',
      task: task({ id: 'a', priority: 'P1' }),
      touched: [],
    };

    const drawn = drawnAfterReply(server, [update], [updated]);

    expect(drawn.columns.DUE_TODAY.tasks[0].priority).toBe('P1');
  });
});
