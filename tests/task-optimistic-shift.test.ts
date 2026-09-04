import { describe, expect, test } from 'bun:test';

import { shiftTaskDueDateInList } from '../src/modules/tasks/lib/task-cache';
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
