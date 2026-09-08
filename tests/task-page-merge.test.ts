import { describe, expect, test } from 'bun:test';

import { mergeTaskPages } from '../src/modules/tasks/lib/task-pages';
import type { Task, TaskPaginatedResponse } from '../src/modules/tasks/schemas/task.schema';

function task(id: string): Task {
  return {
    id,
    title: id,
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: '2026-09-07T17:00:00.000Z',
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: null,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  };
}

function page(
  tasks: Task[],
  { currentPage = 1, totalPages = 1, totalItems = tasks.length, hasNextPage = false } = {}
): TaskPaginatedResponse {
  return {
    data: tasks,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      hasNextPage,
      hasPreviousPage: currentPage > 1,
    },
  };
}

describe('collapsing the pages the board fetched into one list', () => {
  test('the tasks from every page are kept, in the order they arrived', () => {
    const merged = mergeTaskPages([
      page([task('a'), task('b')], {
        currentPage: 1,
        totalPages: 2,
        totalItems: 3,
        hasNextPage: true,
      }),
      page([task('c')], { currentPage: 2, totalPages: 2, totalItems: 3 }),
    ]);

    expect(merged.data.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  // The board reads totalItems for its count. Reporting the server's total while
  // holding fewer rows is how a board says "25 tasks" above 25 cards when there
  // are 39 — the count has to describe what is actually on screen.
  test('the count describes what was actually fetched', () => {
    const merged = mergeTaskPages([
      page([task('a')], { currentPage: 1, totalPages: 9, totalItems: 900, hasNextPage: true }),
    ]);

    expect(merged.pagination.totalItems).toBe(1);
  });

  test('a merged list reports that there is nothing further to fetch', () => {
    const merged = mergeTaskPages([
      page([task('a')], { currentPage: 1, totalPages: 2, totalItems: 2, hasNextPage: true }),
      page([task('b')], { currentPage: 2, totalPages: 2, totalItems: 2 }),
    ]);

    expect(merged.pagination.hasNextPage).toBe(false);
    expect(merged.pagination.hasPreviousPage).toBe(false);
    expect(merged.pagination.currentPage).toBe(1);
    expect(merged.pagination.totalPages).toBe(1);
  });

  test('no pages at all is an empty list, not a crash', () => {
    const merged = mergeTaskPages([]);

    expect(merged.data).toEqual([]);
    expect(merged.pagination.totalItems).toBe(0);
  });
});
