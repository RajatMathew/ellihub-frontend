import { describe, expect, test } from 'bun:test';

import { mailThreadTaskDueLabel } from '../src/modules/email/lib/mail-thread-task-due';
import { toTaskListQuery } from '../src/modules/tasks/lib/task-list-query';

/**
 * elli-ui#983: a task raised from a mail thread was confirmed by a toast and
 * then never appeared. The panel had no way to ask for it — a thread is not an
 * entity, so `filter[entityType]`/`filter[entityId]` could not name one — and
 * said only "Tasks raised here appear on the board".
 *
 * The pair below is what identifies a thread to the server. A conversation key
 * is only unique within a mailbox, so dropping `accountId` would widen the list
 * silently rather than fail.
 */
describe('asking for a mail thread’s tasks', () => {
  const base = { page: 1, size: 50 } as const;

  test('a thread is named by its conversation key and its mailbox', () => {
    const query = toTaskListQuery({
      ...base,
      conversationKey: 'thread-1::quote request',
      accountId: 'account-1',
    });

    expect(query['filter[conversationKey]']).toBe('thread-1::quote request');
    expect(query['filter[accountId]']).toBe('account-1');
    // Flattened, not passed through as nested objects.
    expect(query).not.toHaveProperty('conversationKey');
    expect(query).not.toHaveProperty('accountId');
  });

  test('a list with no thread sends no thread filter', () => {
    // The board and the task list page share this function; neither should
    // start sending an empty filter that narrows to nothing.
    const query = toTaskListQuery({ ...base, entityType: 'PROJECT', entityId: 'project-1' });

    expect(query).not.toHaveProperty('filter[conversationKey]');
    expect(query).not.toHaveProperty('filter[accountId]');
    expect(query['filter[entityType]']).toBe('PROJECT');
  });

  test('paging and sorting stay top-level', () => {
    const query = toTaskListQuery({ ...base, sortBy: 'createdAt', sortOrder: 'desc' });

    expect(query.page).toBe(1);
    expect(query.size).toBe(50);
    expect(query.sortBy).toBe('createdAt');
  });
});

describe('when a thread’s task is due', () => {
  // Fixed clock: a label that reads differently on the machine that runs it is
  // not a test.
  const now = new Date('2026-09-19T12:00:00.000Z');

  test('today and tomorrow are named, not dated', () => {
    expect(mailThreadTaskDueLabel('2026-09-19T17:00:00.000Z', now)).toBe('due today');
    expect(mailThreadTaskDueLabel('2026-09-20T09:00:00.000Z', now)).toBe('due tomorrow');
  });

  test('tomorrow is a calendar day away, not 24 hours away', () => {
    // 9am tomorrow is 21 hours off — under a day, but still tomorrow.
    expect(mailThreadTaskDueLabel('2026-09-20T09:00:00.000Z', now)).not.toBe('due today');
  });

  test('a passed date counts the days it is late', () => {
    expect(mailThreadTaskDueLabel('2026-09-17T09:00:00.000Z', now)).toBe('overdue 2d');
  });

  test('further out gets a date', () => {
    expect(mailThreadTaskDueLabel('2026-10-02T09:00:00.000Z', now)).toBe('due Oct 2');
  });

  test('no due date, and an unusable one, say nothing', () => {
    expect(mailThreadTaskDueLabel(null, now)).toBeNull();
    expect(mailThreadTaskDueLabel(undefined, now)).toBeNull();
    // Rendering "due Invalid Date" under a task is worse than saying nothing.
    expect(mailThreadTaskDueLabel('not a date', now)).toBeNull();
  });
});
