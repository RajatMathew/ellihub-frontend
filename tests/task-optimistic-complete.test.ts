import { describe, expect, test } from 'bun:test';

import { setTaskCompletedInList } from '../src/modules/tasks/lib/task-cache';
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

describe('the optimistic completion', () => {
  // COMPLETED is the one column read off the status rather than the due date,
  // so this is what moves the card — and it has to happen on the click, or the
  // card sits still for a round trip and then jumps. See elli-ui#862.
  test('marks the named task completed', () => {
    const next = setTaskCompletedInList(page([task()]), 'task-1', true);

    expect(next.data[0].status).toBe('COMPLETED');
  });

  test('stamps a completedAt so anything reading it sees a finished task', () => {
    const next = setTaskCompletedInList(page([task()]), 'task-1', true);

    expect(next.data[0].completedAt).toBeString();
  });

  // Reopening is the same control in the other direction, and OPEN is the only
  // other status there is — a task that comes back has no third state to land in.
  test('reopening puts the task back to OPEN and clears the stamp', () => {
    const done = task({ status: 'COMPLETED', completedAt: '2026-09-08T00:00:00.000Z' });
    const next = setTaskCompletedInList(page([done]), 'task-1', false);

    expect(next.data[0].status).toBe('OPEN');
    expect(next.data[0].completedAt).toBeNull();
  });

  test('leaves every other task untouched', () => {
    const next = setTaskCompletedInList(page([task(), task({ id: 'task-2' })]), 'task-1', true);

    expect(next.data[1].status).toBe('OPEN');
  });

  test('an id that is not in this page changes nothing', () => {
    const next = setTaskCompletedInList(page([task()]), 'task-999', true);

    expect(next.data[0].status).toBe('OPEN');
  });

  // The board memoises on the array, so a fresh one every call would re-render
  // every card on an unrelated task's tick — which is the churn the board's
  // state seam was rebuilt to avoid.
  test('returns the same page when nothing changed', () => {
    const before = page([task()]);

    expect(setTaskCompletedInList(before, 'task-999', true)).toBe(before);
  });

  // Ticking a card that is already done is a no-op rather than a re-stamp, so a
  // double click cannot rewrite the completion time.
  test('returns the same page when the task is already in that state', () => {
    const before = page([task({ status: 'COMPLETED' })]);

    expect(setTaskCompletedInList(before, 'task-1', true)).toBe(before);
  });
});
