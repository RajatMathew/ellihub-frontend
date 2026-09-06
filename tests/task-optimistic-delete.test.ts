import { describe, expect, test } from 'bun:test';

import { removeTaskFromList } from '../src/modules/tasks/lib/task-cache';
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

function page(tasks: Task[], totalItems = tasks.length): TaskPaginatedResponse {
  return {
    data: tasks,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

describe('the optimistic delete', () => {
  // The server keeps the row, so this is the only place the task actually
  // leaves the board — and it has to happen on the click. An Undo offered
  // beside a card still sitting there reads as a question, not a reversal.
  test('takes the named task off the page', () => {
    const next = removeTaskFromList(page([task(), task({ id: 'task-2' })]), 'task-1');

    expect(next.data.map((entry) => entry.id)).toEqual(['task-2']);
  });

  test('drops the count with it, so the header agrees with the cards', () => {
    const next = removeTaskFromList(page([task(), task({ id: 'task-2' })]), 'task-1');

    expect(next.pagination.totalItems).toBe(1);
  });

  // A page can hold fewer tasks than the total when there are more pages, and a
  // count that has drifted must not be talked below zero.
  test('never counts past zero', () => {
    const next = removeTaskFromList(page([task()], 0), 'task-1');

    expect(next.pagination.totalItems).toBe(0);
  });

  test('an id that is not in this page changes nothing', () => {
    const next = removeTaskFromList(page([task()]), 'task-999');

    expect(next.data).toHaveLength(1);
  });

  // Same contract the shift keeps: the board memoises on the array, so handing
  // back a new one would re-render every card on an unrelated task's delete.
  test('returns the same page when nothing was removed', () => {
    const before = page([task()]);

    expect(removeTaskFromList(before, 'task-999')).toBe(before);
  });
});
