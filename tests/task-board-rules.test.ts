import { describe, expect, test } from 'bun:test';

import {
  boardArrangementSignature,
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

  // TEMPORARILY DISABLED with the "No due date" column in lib/task-board.ts.
  // test('a task with no due date gets its own column rather than vanishing', () => {
  //   expect(columnForTask(task({ dueAt: null }), NOW)).toBe('NO_DATE');
  // });

  test('while the No due date column is off, a dateless task falls back to Overdue', () => {
    // The due date is required now, so this should not arise — but a task that
    // slips past the API must still land somewhere rather than crash the board.
    expect(columnForTask(task({ dueAt: null }), NOW)).toBe('OVERDUE');
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
    for (const from of ['DUE_TODAY', 'TOMORROW', 'PENDING', 'COMPLETED'] as const) {
      expect(canMoveTask(from, 'OVERDUE').allowed).toBe(false);
    }
  });

  // TEMPORARILY DISABLED with the "No due date" column in lib/task-board.ts.
  // test('nothing can be dragged into No due date, because that would drop a deadline', () => {
  //   expect(canMoveTask('DUE_TODAY', 'NO_DATE').allowed).toBe(false);
  // });

  test('the ordinary reschedules between dated columns are allowed', () => {
    expect(canMoveTask('DUE_TODAY', 'TOMORROW').allowed).toBe(true);
    expect(canMoveTask('PENDING', 'DUE_TODAY').allowed).toBe(true);
    // expect(canMoveTask('NO_DATE', 'TOMORROW').allowed).toBe(true);
  });

  test('a completed task can be reopened into a dated column', () => {
    expect(canMoveTask('COMPLETED', 'DUE_TODAY').allowed).toBe(true);
  });

  test('dropping a card back where it started is a no-op, not a rejection', () => {
    expect(canMoveTask('OVERDUE', 'OVERDUE').allowed).toBe(true);
  });
});

describe('ordering', () => {
  // The rule itself is covered in task-board-ordering.test.ts. This one guards
  // the tiebreak that used to be here: comparing due dates decided nothing
  // inside a column where every card shares a day, which is the swapped cards
  // elli-ui#791 reports. The nearer deadline must NOT jump a card ahead.
  test('worst first: P1 sorts above P3, then the older card, never the nearer deadline', () => {
    const grouped = groupTasksByColumn(
      [
        task({ id: 'low', priority: 'P3', dueAt: '2026-09-02T10:00:00.000Z' }),
        task({
          id: 'high-old',
          priority: 'P1',
          dueAt: '2026-09-02T18:00:00.000Z',
          createdAt: '2026-09-01T09:00:00.000Z',
        }),
        task({
          id: 'high-new',
          priority: 'P1',
          dueAt: '2026-09-02T11:00:00.000Z',
          createdAt: '2026-09-01T09:05:00.000Z',
        }),
      ],
      NOW
    );

    expect(grouped.DUE_TODAY.map((item) => item.id)).toEqual(['high-old', 'high-new', 'low']);
  });
});

describe('the due date a column implies', () => {
  test('the columns that reschedule return a date, the others do not', () => {
    expect(dueDateForColumn('DUE_TODAY', NOW)).not.toBeNull();
    expect(dueDateForColumn('TOMORROW', NOW)).not.toBeNull();
    expect(dueDateForColumn('COMPLETED', NOW)).toBeNull();
    // expect(dueDateForColumn('NO_DATE', NOW)).toBeNull();
    expect(dueDateForColumn('OVERDUE', NOW)).toBeNull();
  });

  // A drop has to stick. End of week is later than tomorrow midweek, but on a
  // Saturday it IS tomorrow and on a Sunday it is today, so a card dropped on
  // Pending at the weekend used to bounce straight back out of the column.
  test('a card dropped on Pending lands in Pending, whatever day it is', () => {
    // Fri 4th through Mon 7th of September 2026.
    for (const day of ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07']) {
      const now = new Date(`${day}T09:00:00.000Z`);
      const dueAt = dueDateForColumn('PENDING', now);

      expect(dueAt).not.toBeNull();
      expect(columnForTask(task({ dueAt: dueAt!.toISOString() }), now)).toBe('PENDING');
    }
  });
});

describe('the signature that re-seeds the board', () => {
  const base = [
    task({ id: 'a', priority: 'P1', dueAt: '2026-09-02T10:00:00.000Z' }),
    task({ id: 'b', priority: 'P3', dueAt: '2026-09-04T10:00:00.000Z' }),
  ];

  // The board mirrors server data into local state so cards can slide apart
  // under a dragged one, and re-seeds only when this string changes. Anything it
  // fails to notice is an edit that never reaches the screen.
  test('notices a priority change, which reorders a column', () => {
    const edited = [task({ ...base[0], priority: 'P2' }), base[1]];

    expect(boardArrangementSignature(edited)).not.toBe(boardArrangementSignature(base));
  });

  test('notices a due date change, which moves a card between columns', () => {
    const edited = [task({ ...base[0], dueAt: '2026-09-20T10:00:00.000Z' }), base[1]];

    expect(boardArrangementSignature(edited)).not.toBe(boardArrangementSignature(base));
  });

  test('notices completion, which moves a card to Completed', () => {
    const edited = [task({ ...base[0], status: 'COMPLETED' }), base[1]];

    expect(boardArrangementSignature(edited)).not.toBe(boardArrangementSignature(base));
  });

  test('notices a task arriving or leaving', () => {
    expect(boardArrangementSignature([base[0]])).not.toBe(boardArrangementSignature(base));
  });

  // Card content is read from server data at render, not from the mirrored
  // arrangement, so a title edit does not need to re-seed anything.
  test('ignores an edit that cannot change the arrangement', () => {
    const edited = [task({ ...base[0], title: 'A completely different title' }), base[1]];

    expect(boardArrangementSignature(edited)).toBe(boardArrangementSignature(base));
  });
});
