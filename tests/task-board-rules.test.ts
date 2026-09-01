import { describe, expect, test } from 'bun:test';

import {
  canMoveTask,
  columnForTask,
  dueDateForColumn,
  groupTasksByColumn,
} from '../src/modules/tasks/lib/task-board';
import type { Task } from '../src/modules/tasks/schemas/task.schema';

// A Wednesday, so "this week" still has room after tomorrow.
const NOW = new Date('2026-09-02T09:00:00.000Z');

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: null,
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('which column a task lands in', () => {
  test('a completed task is Completed whatever its due date says', () => {
    const late = task({ status: 'COMPLETED', dueAt: '2026-08-01T09:00:00.000Z' });
    expect(columnForTask(late, NOW)).toBe('COMPLETED');
  });

  test('a past due date is Overdue, today is Due Today, tomorrow is Tomorrow', () => {
    expect(columnForTask(task({ dueAt: '2026-08-30T09:00:00.000Z' }), NOW)).toBe('OVERDUE');
    expect(columnForTask(task({ dueAt: '2026-09-02T16:00:00.000Z' }), NOW)).toBe('DUE_TODAY');
    expect(columnForTask(task({ dueAt: '2026-09-03T08:00:00.000Z' }), NOW)).toBe('TOMORROW');
  });

  test('a task with no due date gets its own column rather than vanishing', () => {
    expect(columnForTask(task({ dueAt: null }), NOW)).toBe('NO_DATE');
  });
});

describe('the drag rules', () => {
  test('an overdue task can be completed', () => {
    expect(canMoveTask('OVERDUE', 'COMPLETED').allowed).toBe(true);
  });

  test('an overdue task cannot be dragged to Due Today', () => {
    // The rule the ticket calls out: rescheduling by drag would quietly erase
    // the fact that the task is late.
    const move = canMoveTask('OVERDUE', 'DUE_TODAY');
    expect(move.allowed).toBe(false);
    expect(move.reason).toBeTruthy();
  });

  test('nothing can be dragged into Overdue', () => {
    for (const from of ['DUE_TODAY', 'TOMORROW', 'THIS_WEEK', 'COMPLETED', 'NO_DATE'] as const) {
      expect(canMoveTask(from, 'OVERDUE').allowed).toBe(false);
    }
  });

  test('nothing can be dragged into No due date, because that would drop a deadline', () => {
    expect(canMoveTask('DUE_TODAY', 'NO_DATE').allowed).toBe(false);
  });

  test('the ordinary reschedules between dated columns are allowed', () => {
    expect(canMoveTask('DUE_TODAY', 'TOMORROW').allowed).toBe(true);
    expect(canMoveTask('THIS_WEEK', 'DUE_TODAY').allowed).toBe(true);
    expect(canMoveTask('NO_DATE', 'TOMORROW').allowed).toBe(true);
  });

  test('a completed task can be reopened into a dated column', () => {
    expect(canMoveTask('COMPLETED', 'DUE_TODAY').allowed).toBe(true);
  });

  test('dropping a card back where it started is a no-op, not a rejection', () => {
    expect(canMoveTask('OVERDUE', 'OVERDUE').allowed).toBe(true);
  });
});

describe('ordering', () => {
  test('worst first: P1 sorts above P3, then the nearer deadline', () => {
    const grouped = groupTasksByColumn(
      [
        task({ id: 'low', priority: 'P3', dueAt: '2026-09-02T10:00:00.000Z' }),
        task({ id: 'high-late', priority: 'P1', dueAt: '2026-09-02T18:00:00.000Z' }),
        task({ id: 'high-early', priority: 'P1', dueAt: '2026-09-02T11:00:00.000Z' }),
      ],
      NOW
    );

    expect(grouped.DUE_TODAY.map((item) => item.id)).toEqual(['high-early', 'high-late', 'low']);
  });
});

describe('the due date a column implies', () => {
  test('the columns that reschedule return a date, the others do not', () => {
    expect(dueDateForColumn('DUE_TODAY', NOW)).not.toBeNull();
    expect(dueDateForColumn('TOMORROW', NOW)).not.toBeNull();
    expect(dueDateForColumn('COMPLETED', NOW)).toBeNull();
    expect(dueDateForColumn('NO_DATE', NOW)).toBeNull();
    expect(dueDateForColumn('OVERDUE', NOW)).toBeNull();
  });
});
