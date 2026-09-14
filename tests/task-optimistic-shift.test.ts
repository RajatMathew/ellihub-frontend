import { describe, expect, test } from 'bun:test';

import { placeTaskInList, shiftTaskDueDateInList } from '../src/modules/tasks/lib/task-cache';
import type { Task, TaskPaginatedResponse } from '../src/modules/tasks/schemas/task.schema';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: '2026-09-15T00:00:00.000Z',
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

function page(tasks: Task[]): TaskPaginatedResponse {
  return {
    data: tasks,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: tasks.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

describe('the optimistic due-date shift', () => {
  // The card has to move the instant it is clicked. Waiting for the round trip
  // is what made +1 day look like it had done nothing.
  test('moves the named task by the given number of days', () => {
    const next = shiftTaskDueDateInList(page([task()]), 'task-1', 1);

    expect(next.data[0].dueAt).toBe('2026-09-16T00:00:00.000Z');
  });

  test('a negative shift pulls the date back', () => {
    const next = shiftTaskDueDateInList(page([task()]), 'task-1', -1);

    expect(next.data[0].dueAt).toBe('2026-09-14T00:00:00.000Z');
  });

  test('leaves every other task untouched', () => {
    const next = shiftTaskDueDateInList(
      page([task(), task({ id: 'task-2', dueAt: '2026-10-01T00:00:00.000Z' })]),
      'task-1',
      1
    );

    expect(next.data[1].dueAt).toBe('2026-10-01T00:00:00.000Z');
  });

  // The card hides its +1 button when there is no date, but a stale cache or a
  // second tab could still ask. Inventing one would put the task in a column the
  // server never agreed to.
  test('a task with no due date is left alone', () => {
    const next = shiftTaskDueDateInList(page([task({ dueAt: null })]), 'task-1', 1);

    expect(next.data[0].dueAt).toBeNull();
  });

  test('an id that is not in this page changes nothing', () => {
    const before = page([task()]);
    const next = shiftTaskDueDateInList(before, 'task-999', 1);

    expect(next.data[0].dueAt).toBe('2026-09-15T00:00:00.000Z');
  });

  // The board memoises on the array, so a new one every call would make every
  // card re-render on an unrelated task's shift.
  test('returns the same page when nothing changed', () => {
    const before = page([task()]);

    expect(shiftTaskDueDateInList(before, 'task-999', 1)).toBe(before);
  });
});

// elli-ui#791. The server clears boardOrder on a due-date change, so the card
// lands in its new column by priority and then by age. The optimistic write has
// to do the same, or the card sits in its hand-placed slot for a moment and
// then jumps when the response arrives.
describe('a shift gives up the hand-placed position', () => {
  test('the +1 day shift clears boardOrder', () => {
    const cached = page([task({ id: 'task-1', boardOrder: 1_700_000_000_000 })]);

    const next = shiftTaskDueDateInList(cached, 'task-1', 1);

    expect(next.data[0].boardOrder).toBeNull();
  });

  test('a task nobody shifted is left alone', () => {
    const cached = page([task({ id: 'other', boardOrder: 1_700_000_000_000 })]);

    expect(shiftTaskDueDateInList(cached, 'task-1', 1)).toBe(cached);
  });
});

describe('showing a drop before the server answers', () => {
  test('the dropped card takes the position it was given', () => {
    const cached = page([task({ id: 'task-1' })]);

    expect(placeTaskInList(cached, 'task-1', 1500).data[0].boardOrder).toBe(1500);
  });

  test('a page without that task comes back untouched, by reference', () => {
    const cached = page([task({ id: 'other' })]);

    expect(placeTaskInList(cached, 'task-1', 1500)).toBe(cached);
  });
});

// A card dragged into another column is rescheduled and placed in one write, so
// the optimistic update has to do both. Doing them separately would land the
// card by age in its new column and then move it when the response arrived.
describe('showing a card dropped into another column', () => {
  test('the new due date and the position are written together', () => {
    const cached = page([task({ id: 'task-1', dueAt: '2026-09-15T00:00:00.000Z' })]);

    const next = placeTaskInList(cached, 'task-1', 1500, '2026-09-16T00:00:00.000Z');

    expect(next.data[0].dueAt).toBe('2026-09-16T00:00:00.000Z');
    expect(next.data[0].boardOrder).toBe(1500);
  });

  test('a reorder within a column leaves the due date alone', () => {
    const cached = page([task({ id: 'task-1', dueAt: '2026-09-15T00:00:00.000Z' })]);

    const next = placeTaskInList(cached, 'task-1', 1500);

    expect(next.data[0].dueAt).toBe('2026-09-15T00:00:00.000Z');
    expect(next.data[0].boardOrder).toBe(1500);
  });
});
