import { describe, expect, test } from 'bun:test';

import {
  buildOptimisticTask,
  isOptimisticTaskId,
  newOptimisticTaskId,
} from '../src/modules/tasks/lib/optimistic-task';
import {
  insertTaskInList,
  listWantsTask,
  patchTaskInList,
  removeTaskFromList,
  replaceTaskInList,
} from '../src/modules/tasks/lib/task-cache';
import { holdThreadTaskOrder, orderThreadTasks } from '../src/modules/tasks/lib/thread-task-order';
import type {
  CreateTaskInput,
  Task,
  TaskPaginatedResponse,
} from '../src/modules/tasks/schemas/task.schema';

/**
 * Adding a task and ticking one off, drawn before the server answers
 * (elli-ui#1125).
 *
 * The parts worth pinning are the ones that decide whether a row can be
 * trusted: which lists it may land in, that it survives being confirmed
 * without moving or doubling, and that a failed create leaves nothing behind.
 */

const NOW = new Date('2026-09-24T10:00:00.000Z');

const reference = {
  accountId: 'acct-1',
  providerId: 'msg-1',
  conversationKey: 'conv-1',
  threadId: null,
  subject: 'Bid due Friday',
  fromEmail: 'gc@example.com',
};

const input: CreateTaskInput = {
  title: 'Chase the bid',
  priority: 'P2',
  court: 'OURS',
  dueAt: '2026-09-25T17:00:00.000Z',
  dueHasTime: true,
  emailReferences: [reference],
};

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Chase the bid',
  description: null,
  priority: 'P2',
  status: 'OPEN',
  court: 'OURS',
  dueAt: null,
  dueHasTime: false,
  completedAt: null,
  assigneeId: null,
  assignee: null,
  entityLinks: [],
  emailReferences: [reference],
  boardOrder: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const page = (tasks: Task[], totalItems = tasks.length): TaskPaginatedResponse => ({
  data: tasks,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

describe('the row a create draws before it is saved', () => {
  test('carries every field the list shows, and opens as open', () => {
    const drawn = buildOptimisticTask(input, { id: 'temp-1', now: NOW });

    expect(drawn.title).toBe('Chase the bid');
    expect(drawn.priority).toBe('P2');
    expect(drawn.court).toBe('OURS');
    expect(drawn.dueAt).toBe('2026-09-25T17:00:00.000Z');
    expect(drawn.emailReferences).toEqual([reference]);
    // What decides the tick state and the board column.
    expect(drawn.status).toBe('OPEN');
    expect(drawn.completedAt).toBeNull();
    // Nobody has placed it, so it sorts by age — where the server puts it too.
    expect(drawn.boardOrder).toBeNull();
  });

  test('is recognisable as unsaved, and a real id never is', () => {
    expect(isOptimisticTaskId(newOptimisticTaskId())).toBe(true);
    // Server ids are ULIDs. Nothing that reaches the client may be mistaken
    // for a row still in flight, or a real task would be left undismissable.
    expect(isOptimisticTaskId('01J9ZC6K3H8QW2N5V7YB4T0XRM')).toBe(false);
    expect(isOptimisticTaskId('')).toBe(false);
  });

  test('gives two rapid creates rows of their own', () => {
    expect(newOptimisticTaskId()).not.toBe(newOptimisticTaskId());
  });
});

describe('which lists an unsaved row may land in', () => {
  test('the thread it was raised from, matched on mailbox and conversation', () => {
    expect(listWantsTask({ accountId: 'acct-1', conversationKey: 'conv-1' }, task())).toBe(true);
  });

  test('never another thread, and never the same key in another mailbox', () => {
    expect(listWantsTask({ accountId: 'acct-1', conversationKey: 'conv-2' }, task())).toBe(false);
    // A conversation key is only unique within a mailbox — matching on the key
    // alone would drop a task into the wrong account's panel.
    expect(listWantsTask({ accountId: 'acct-2', conversationKey: 'conv-1' }, task())).toBe(false);
  });

  test('a task raised from no mail is in no thread list', () => {
    expect(
      listWantsTask(
        { accountId: 'acct-1', conversationKey: 'conv-1' },
        task({ emailReferences: [] })
      )
    ).toBe(false);
  });

  test('the unfiltered list takes everything', () => {
    expect(listWantsTask(undefined, task())).toBe(true);
    expect(listWantsTask({ page: 1, size: 50 } as never, task({ emailReferences: [] }))).toBe(true);
  });

  test('a narrowed list still refuses what it would not have returned', () => {
    expect(listWantsTask({ status: 'COMPLETED' }, task({ status: 'OPEN' }))).toBe(false);
    expect(listWantsTask({ priority: 'P1' }, task({ priority: 'P2' }))).toBe(false);
    expect(listWantsTask({ assigneeId: 'user-9' }, task({ assigneeId: null }))).toBe(false);
  });
});

describe('the page as the row arrives, is confirmed, or fails', () => {
  test('a new row goes to the front, where the reader is looking', () => {
    const next = insertTaskInList(page([task({ id: 'old' })]), task({ id: 'new' }));

    expect(next.data.map((held) => held.id)).toEqual(['new', 'old']);
    expect(next.pagination.totalItems).toBe(2);
  });

  test('a row already on the page is replaced, not added twice', () => {
    // A refetch landing mid-flight must not leave the reader with two of the
    // same task.
    const next = insertTaskInList(
      page([task({ id: 'new', title: 'Old title' })]),
      task({ id: 'new' })
    );

    expect(next.data).toHaveLength(1);
    expect(next.data[0]!.title).toBe('Chase the bid');
    expect(next.pagination.totalItems).toBe(1);
  });

  test('confirming swaps the id in place, so the row does not jump', () => {
    const before = page([task({ id: 'a' }), task({ id: 'temp' }), task({ id: 'b' })]);
    const next = replaceTaskInList(before, 'temp', task({ id: 'real' }));

    expect(next.data.map((held) => held.id)).toEqual(['a', 'real', 'b']);
    expect(next.pagination.totalItems).toBe(3);
  });

  test('a failed create takes its row and its count away again', () => {
    const next = removeTaskFromList(page([task({ id: 'temp' }), task({ id: 'kept' })]), 'temp');

    expect(next.data.map((held) => held.id)).toEqual(['kept']);
    expect(next.pagination.totalItems).toBe(1);
  });

  test('ticking one off changes that row and leaves the rest alone', () => {
    const before = page([task({ id: 'a' }), task({ id: 'b' })]);
    const next = patchTaskInList(before, 'b', {
      status: 'COMPLETED',
      completedAt: NOW.toISOString(),
    });

    expect(next.data[1]!.status).toBe('COMPLETED');
    expect(next.data[0]).toBe(before.data[0]);
  });

  test('a page that did not change is returned by reference', () => {
    // The panel memoises on the page; a fresh object for no change re-renders
    // every row.
    const before = page([task({ id: 'a' })]);

    expect(patchTaskInList(before, 'missing', { status: 'COMPLETED' })).toBe(before);
    expect(removeTaskFromList(before, 'missing')).toBe(before);
  });
});

describe('the order a tick must not disturb', () => {
  const ids = (tasks: readonly Task[]) => tasks.map((held) => held.id);

  const open = (id: string, priority: Task['priority']) => task({ id, priority });
  const done = (id: string, priority: Task['priority']) =>
    task({ id, priority, status: 'COMPLETED' });

  test('a freshly opened thread is ordered by the rule', () => {
    // Nothing held yet: worst first, completed last.
    expect(
      ids(holdThreadTaskOrder(orderThreadTasks([done('a', 'P1'), open('b', 'P3')]), []))
    ).toEqual(['b', 'a']);
  });

  test('ticking a row leaves it exactly where it was', () => {
    const before = orderThreadTasks([open('a', 'P1'), open('b', 'P2'), open('c', 'P3')]);
    const held = ids(before);

    // `b` is ticked: the rule alone would send it to the end and pull `c` up
    // into the slot the reader just clicked.
    const after = holdThreadTaskOrder(
      orderThreadTasks([open('a', 'P1'), done('b', 'P2'), open('c', 'P3')]),
      held
    );

    expect(ids(after)).toEqual(['a', 'b', 'c']);
    expect(after[1]!.status).toBe('COMPLETED');
  });

  test('unticking does not move it either', () => {
    const after = holdThreadTaskOrder(
      orderThreadTasks([open('a', 'P1'), open('b', 'P2'), open('c', 'P3')]),
      ['a', 'b', 'c']
    );

    expect(ids(after)).toEqual(['a', 'b', 'c']);
  });

  test('a new task lands where the rule puts it, among the held rows', () => {
    const after = holdThreadTaskOrder(
      orderThreadTasks([open('a', 'P2'), open('new', 'P1'), open('b', 'P3')]),
      ['a', 'b']
    );

    // P1 leads; the two held rows keep their order behind it.
    expect(ids(after)).toEqual(['new', 'a', 'b']);
  });

  test('a task that has gone stops holding its place', () => {
    const after = holdThreadTaskOrder(orderThreadTasks([open('a', 'P2'), open('c', 'P3')]), [
      'a',
      'deleted',
      'c',
    ]);

    expect(ids(after)).toEqual(['a', 'c']);
  });

  test('every task comes back exactly once, however the two orders disagree', () => {
    const tasks = [done('a', 'P3'), open('b', 'P1'), open('c', 'P2'), done('d', 'P1')];
    const after = holdThreadTaskOrder(orderThreadTasks(tasks), ['d', 'c', 'b', 'a']);

    expect(after).toHaveLength(4);
    expect(new Set(ids(after))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });
});
