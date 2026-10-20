import { describe, expect, test } from 'bun:test';

import {
  boardTasks,
  columnOf,
  patchTaskInBoard,
  removeTaskFromBoard,
  upsertTaskInBoard,
} from '../src/modules/tasks/lib/task-cache';
import type { Task, TaskBoard } from '../src/modules/tasks/schemas/task.schema';

// A fixed clock: 15 September 2026, mid-morning, local time.
const now = new Date(2026, 8, 15, 10, 0, 0);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 17, 0, 0).toISOString();

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: local(2026, 9, 15),
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

function board(columns: Partial<Record<keyof TaskBoard['columns'], Task[]>>): TaskBoard {
  const make = (tasks: Task[] = []) => ({ tasks, total: tasks.length });
  return {
    today: '2026-09-15',
    people: [],
    columns: {
      OVERDUE: make(columns.OVERDUE),
      DUE_TODAY: make(columns.DUE_TODAY),
      TOMORROW: make(columns.TOMORROW),
      PENDING: make(columns.PENDING),
      COMPLETED: make(columns.COMPLETED),
    },
  };
}

const ids = (board: TaskBoard, column: keyof TaskBoard['columns']) =>
  board.columns[column].tasks.map((task) => task.id);

// The board is patched from what each write returns instead of being
// refetched, so these are what "the card moves on the click" now rests on.
describe('putting a task on the board', () => {
  test('a task the board has never seen joins the column its date puts it in', () => {
    const next = upsertTaskInBoard(board({}), task({ dueAt: local(2026, 9, 16) }), now);

    expect(ids(next, 'TOMORROW')).toEqual(['task-1']);
    expect(next.columns.TOMORROW.total).toBe(1);
  });

  test('a task whose status changed leaves its old column and totals follow', () => {
    const open = task();
    const start = board({ DUE_TODAY: [open] });

    const next = upsertTaskInBoard(start, { ...open, status: 'COMPLETED' }, now);

    expect(ids(next, 'DUE_TODAY')).toEqual([]);
    expect(next.columns.DUE_TODAY.total).toBe(0);
    expect(ids(next, 'COMPLETED')).toEqual(['task-1']);
    expect(next.columns.COMPLETED.total).toBe(1);
  });

  test('a task is slotted by the board order, not appended', () => {
    const first = task({ id: 'a', priority: 'P1' });
    const last = task({ id: 'c', priority: 'P3', createdAt: '2026-09-02T00:00:00.000Z' });
    const start = board({ DUE_TODAY: [first, last] });

    const next = upsertTaskInBoard(start, task({ id: 'b', priority: 'P3' }), now);

    expect(ids(next, 'DUE_TODAY')).toEqual(['a', 'b', 'c']);
  });

  test('a hand-placed position decides the slot', () => {
    const a = task({ id: 'a', boardOrder: 100 });
    const c = task({ id: 'c', boardOrder: 300 });
    const start = board({ DUE_TODAY: [a, c] });

    const next = upsertTaskInBoard(start, task({ id: 'b', boardOrder: 200 }), now);

    expect(ids(next, 'DUE_TODAY')).toEqual(['a', 'b', 'c']);
  });

  test('a task already in place with the same content changes nothing', () => {
    const held = task();
    const start = board({ DUE_TODAY: [held] });

    expect(upsertTaskInBoard(start, held, now)).toBe(start);
  });

  test('columns the task did not touch keep their reference', () => {
    const elsewhere = task({ id: 'x', dueAt: local(2026, 9, 1) });
    const start = board({ OVERDUE: [elsewhere], DUE_TODAY: [task()] });

    const next = upsertTaskInBoard(start, task({ title: 'Renamed' }), now);

    expect(next.columns.OVERDUE).toBe(start.columns.OVERDUE);
  });

  test('a completed task with no date still has a column', () => {
    const next = upsertTaskInBoard(board({}), task({ dueAt: null, status: 'COMPLETED' }), now);

    expect(columnOf(next, 'task-1')).toBe('COMPLETED');
  });
});

describe('taking a task off the board', () => {
  test('removes it and drops the total with it', () => {
    const start = board({ DUE_TODAY: [task({ id: 'a' }), task({ id: 'b' })] });

    const next = removeTaskFromBoard(start, 'a');

    expect(ids(next, 'DUE_TODAY')).toEqual(['b']);
    expect(next.columns.DUE_TODAY.total).toBe(1);
  });

  test('never counts past zero', () => {
    const start = board({ DUE_TODAY: [task()] });
    start.columns.DUE_TODAY.total = 0;

    expect(removeTaskFromBoard(start, 'task-1').columns.DUE_TODAY.total).toBe(0);
  });

  test('an id the board does not hold changes nothing', () => {
    const start = board({ DUE_TODAY: [task()] });

    expect(removeTaskFromBoard(start, 'nope')).toBe(start);
  });
});

describe('changing part of a task', () => {
  test('completing moves the card and stamps it', () => {
    const start = board({ DUE_TODAY: [task()] });

    const next = patchTaskInBoard(
      start,
      'task-1',
      { status: 'COMPLETED', completedAt: now.toISOString(), boardOrder: null },
      now
    );

    expect(columnOf(next, 'task-1')).toBe('COMPLETED');
    expect(boardTasks(next)[0].completedAt).toBe(now.toISOString());
  });

  test('reopening puts it back under its date', () => {
    const done = task({ status: 'COMPLETED', completedAt: now.toISOString() });
    const start = board({ COMPLETED: [done] });

    const next = patchTaskInBoard(start, 'task-1', { status: 'OPEN', completedAt: null }, now);

    expect(columnOf(next, 'task-1')).toBe('DUE_TODAY');
  });

  test('a day forward moves the card to Tomorrow', () => {
    const start = board({ DUE_TODAY: [task()] });

    const next = patchTaskInBoard(
      start,
      'task-1',
      { dueAt: local(2026, 9, 16), boardOrder: null },
      now
    );

    expect(columnOf(next, 'task-1')).toBe('TOMORROW');
  });

  test('a day back from today lands in Overdue', () => {
    const start = board({ DUE_TODAY: [task()] });

    const next = patchTaskInBoard(start, 'task-1', { dueAt: local(2026, 9, 14) }, now);

    expect(columnOf(next, 'task-1')).toBe('OVERDUE');
  });

  test('a priority change re-slots the card in its column', () => {
    const a = task({ id: 'a', priority: 'P1' });
    const b = task({ id: 'b', priority: 'P3' });
    const start = board({ DUE_TODAY: [a, b] });

    const next = patchTaskInBoard(start, 'b', { priority: 'P1', boardOrder: null }, now);

    // Same priority now, and `b` was created later, so it sits second.
    expect(ids(next, 'DUE_TODAY')).toEqual(['a', 'b']);
    const promoted = patchTaskInBoard(
      start,
      'b',
      { priority: 'P1', createdAt: '2026-08-01T00:00:00.000Z', boardOrder: null },
      now
    );
    expect(ids(promoted, 'DUE_TODAY')).toEqual(['b', 'a']);
  });

  test('other tasks are untouched', () => {
    const other = task({ id: 'other' });
    const start = board({ DUE_TODAY: [task(), other] });

    const next = patchTaskInBoard(start, 'task-1', { title: 'Renamed' }, now);

    expect(next.columns.DUE_TODAY.tasks.find((t) => t.id === 'other')).toBe(other);
  });

  test('a patch that changes nothing returns the same board', () => {
    const start = board({ DUE_TODAY: [task()] });

    expect(patchTaskInBoard(start, 'task-1', { status: 'OPEN' }, now)).toBe(start);
  });

  test('an id the board does not hold changes nothing', () => {
    const start = board({ DUE_TODAY: [task()] });

    expect(patchTaskInBoard(start, 'nope', { title: 'x' }, now)).toBe(start);
  });
});
