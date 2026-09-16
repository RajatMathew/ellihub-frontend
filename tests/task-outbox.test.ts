import { describe, expect, test } from 'bun:test';

import { applyOps, toWire, type TaskOp } from '../src/modules/tasks/lib/task-ops';
import { enqueue, flushesNow, nextBatch, settle } from '../src/modules/tasks/lib/task-outbox';
import type { Task, TaskBoard } from '../src/modules/tasks/schemas/task.schema';

const none = new Set<string>();
let n = 0;
const id = () => `op-${(n += 1)}`;

const update = (task: string, fields: Extract<TaskOp, { type: 'update' }>['fields']): TaskOp => ({
  opId: id(),
  type: 'update',
  id: task,
  fields,
});
const shift = (task: string, days: number): TaskOp => ({
  opId: id(),
  type: 'shiftDueDate',
  id: task,
  days,
});
const reorder = (task: string): TaskOp => ({
  opId: id(),
  type: 'reorder',
  id: task,
  previousId: null,
  nextId: null,
  boardOrder: 5,
});
const complete = (task: string): TaskOp => ({
  opId: id(),
  type: 'complete',
  id: task,
  completed: true,
  completedAt: '2026-09-16T10:00:00.000Z',
});
const remove = (task: string): TaskOp => ({ opId: id(), type: 'delete', id: task, title: 'x' });

const queue = (...ops: TaskOp[]) => ops.reduce<TaskOp[]>((q, op) => enqueue(q, op, none), []);

// The rule under everything here: the server applies a batch in the order
// sent, and for one card that order is the meaning.
describe('what merges in the outbox', () => {
  test('two field edits on one card become one op, last value per field', () => {
    const q = queue(
      update('a', { priority: 'P1' }),
      update('a', { court: 'THEIRS' }),
      update('a', { priority: 'P2' })
    );

    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ type: 'update', fields: { priority: 'P2', court: 'THEIRS' } });
  });

  test('two +1 days become +2', () => {
    const q = queue(shift('a', 1), shift('a', 1));

    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ type: 'shiftDueDate', days: 2 });
  });

  test('edits on different cards stay separate', () => {
    expect(queue(update('a', { court: 'OURS' }), update('b', { court: 'OURS' }))).toHaveLength(2);
  });

  // A drag names neighbours in the block the card was in when it was dragged.
  // A priority change merged to before the drag would put the card in another
  // block first and the server would refuse the drag.
  test('an edit after a drag does not merge into an edit before it', () => {
    const q = queue(
      update('a', { court: 'THEIRS' }),
      reorder('a'),
      update('a', { priority: 'P1' })
    );

    expect(q.map((op) => op.type)).toEqual(['update', 'reorder', 'update']);
  });

  test('a tick or a delete fixes the order the same way', () => {
    expect(queue(shift('a', 1), complete('a'), shift('a', 1)).map((op) => op.type)).toEqual([
      'shiftDueDate',
      'complete',
      'shiftDueDate',
    ]);
  });

  test('drags never merge', () => {
    expect(queue(reorder('a'), reorder('a'))).toHaveLength(2);
  });

  test('an op already on the wire is not merged into', () => {
    const first = update('a', { court: 'OURS' });
    const q = enqueue([first], update('a', { court: 'THEIRS' }), new Set([first.opId]));

    expect(q).toHaveLength(2);
    expect(q[0]).toBe(first);
  });

  test('a delete drops the unsent ops on that card', () => {
    const q = queue(
      update('a', { court: 'OURS' }),
      shift('a', 1),
      update('b', { court: 'OURS' }),
      remove('a')
    );

    expect(q.map((op) => `${op.type}:${op.id}`)).toEqual(['update:b', 'delete:a']);
  });

  test('a delete leaves an op that is already on the wire alone', () => {
    const sent = update('a', { court: 'OURS' });
    const q = enqueue([sent], remove('a'), new Set([sent.opId]));

    expect(q.map((op) => op.type)).toEqual(['update', 'delete']);
  });
});

describe('when the outbox flushes', () => {
  test('a tick or a delete goes out at once; edits and drags wait', () => {
    expect(flushesNow(complete('a'))).toBe(true);
    expect(flushesNow(remove('a'))).toBe(true);
    expect(flushesNow(update('a', { court: 'OURS' }))).toBe(false);
    expect(flushesNow(reorder('a'))).toBe(false);
    expect(flushesNow(shift('a', 1))).toBe(false);
  });

  test('the next batch is everything not yet sent, in order', () => {
    const a = update('a', { court: 'OURS' }),
      b = reorder('b'),
      c = shift('c', 1);

    expect(nextBatch([a, b, c], new Set([b.opId]))).toEqual([a, c]);
  });
});

describe('what a reply does to the outbox', () => {
  test('answered ops leave, unanswered ones stay, refusals are reported', () => {
    const a = update('a', { court: 'OURS' }),
      b = reorder('b'),
      c = shift('c', 1);
    const { pending, confirmed, failed } = settle(
      [a, b, c],
      [
        { opId: a.opId, ok: true },
        { opId: b.opId, ok: false, error: { message: 'no', status: 400 } },
      ]
    );

    expect(pending).toEqual([c]);
    expect(confirmed).toEqual([a]);
    expect(failed).toEqual([{ op: b, error: { message: 'no', status: 400 } }]);
  });
});

describe('what the server is sent', () => {
  test('an update goes as its fields, without the client-side assignee', () => {
    const op: TaskOp = {
      opId: 'x',
      type: 'update',
      id: 'a',
      fields: { assigneeId: 'e1' },
      assignee: { id: 'e1', name: 'Eve' },
    };

    expect(toWire(op)).toEqual({ opId: 'x', type: 'update', id: 'a', assigneeId: 'e1' });
  });

  test('a drag across columns carries its date; within a column it does not', () => {
    const across = toWire({
      opId: 'x',
      type: 'reorder',
      id: 'a',
      previousId: 'p',
      nextId: null,
      boardOrder: 1,
      dueAt: '2026-09-17T00:00:00.000Z',
    });
    const within = toWire({
      opId: 'y',
      type: 'reorder',
      id: 'a',
      previousId: 'p',
      nextId: null,
      boardOrder: 1,
    });

    expect(across).toMatchObject({ dueAt: '2026-09-17T00:00:00.000Z', dueHasTime: false });
    expect(within).not.toHaveProperty('dueAt');
    expect(within).not.toHaveProperty('boardOrder');
  });
});

describe('the board the person sees', () => {
  const now = new Date(2026, 8, 16, 10, 0, 0);
  const task = (over: Partial<Task>): Task =>
    ({
      id: 't',
      title: 'x',
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

  test('pending ops apply in order on top of the server board', () => {
    const start = board([task({ id: 'a' })]);
    const shown = applyOps(start, [shift('a', 1), complete('a')], now);

    expect(shown.columns.COMPLETED.tasks.map((t) => t.id)).toEqual(['a']);
    expect(shown.columns.TOMORROW.tasks).toEqual([]);
    // The server board itself is untouched.
    expect(start.columns.DUE_TODAY.tasks.map((t) => t.id)).toEqual(['a']);
  });

  test('dropping a refused op is the rollback', () => {
    const start = board([task({ id: 'a' })]);
    const ops = [update('a', { priority: 'P1' }), shift('a', 1)];
    const withBoth = applyOps(start, ops, now);
    const withoutShift = applyOps(start, [ops[0]], now);

    expect(withBoth.columns.TOMORROW.tasks).toHaveLength(1);
    expect(withoutShift.columns.DUE_TODAY.tasks[0].priority).toBe('P1');
    expect(withoutShift.columns.TOMORROW.tasks).toHaveLength(0);
  });
});
