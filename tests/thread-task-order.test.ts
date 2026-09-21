import { describe, expect, test } from 'bun:test';

import { orderThreadTasks } from '../src/modules/tasks/lib/thread-task-order';
import type { Task, TaskPriority, TaskStatus } from '../src/modules/tasks/schemas/task.schema';

let seq = 0;

function task(
  overrides: {
    id?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueAt?: string | null;
    createdAt?: string;
  } = {}
): Task {
  seq += 1;
  return {
    id: overrides.id ?? `task-${seq}`,
    title: overrides.id ?? `task-${seq}`,
    description: null,
    priority: overrides.priority ?? 'P2',
    status: overrides.status ?? 'OPEN',
    court: 'OURS',
    dueAt: overrides.dueAt === undefined ? '2026-09-25T09:00:00.000Z' : overrides.dueAt,
    dueHasTime: true,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: null,
    createdAt: overrides.createdAt ?? '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Task;
}

const ids = (tasks: readonly Task[]) => tasks.map((item) => item.id);

describe('orderThreadTasks (elli-ui#1057)', () => {
  test('sorts by priority, worst first', () => {
    const list = [
      task({ id: 'p3', priority: 'P3' }),
      task({ id: 'p1', priority: 'P1' }),
      task({ id: 'p2', priority: 'P2' }),
    ];
    expect(ids(orderThreadTasks(list))).toEqual(['p1', 'p2', 'p3']);
  });

  test('keeps completed tasks below open ones however urgent they were', () => {
    // A finished P1 is a record, not work. Sorting on priority alone parked it
    // at the top of the panel above everything still outstanding.
    const list = [
      task({ id: 'done-p1', priority: 'P1', status: 'COMPLETED' }),
      task({ id: 'open-p3', priority: 'P3' }),
    ];
    expect(ids(orderThreadTasks(list))).toEqual(['open-p3', 'done-p1']);
  });

  test('breaks a priority tie with the soonest due date', () => {
    const list = [
      task({ id: 'later', dueAt: '2026-10-02T09:00:00.000Z' }),
      task({ id: 'sooner', dueAt: '2026-09-22T09:00:00.000Z' }),
    ];
    expect(ids(orderThreadTasks(list))).toEqual(['sooner', 'later']);
  });

  test('sorts a task with no due date after dated ones of the same priority', () => {
    const list = [task({ id: 'undated', dueAt: null }), task({ id: 'dated' })];
    expect(ids(orderThreadTasks(list))).toEqual(['dated', 'undated']);
  });

  test('an unparseable due date sorts with the undated, not to the top', () => {
    // A NaN timestamp compares false against everything, so it used to settle
    // wherever the sort happened to leave it.
    const list = [task({ id: 'broken', dueAt: 'not a date' }), task({ id: 'dated' })];
    expect(ids(orderThreadTasks(list))).toEqual(['dated', 'broken']);
  });

  test('is a total order, so a re-sort cannot reshuffle equal tasks', () => {
    const list = [
      task({ id: 'second', createdAt: '2026-09-02T00:00:00.000Z' }),
      task({ id: 'first', createdAt: '2026-09-01T00:00:00.000Z' }),
    ];
    const once = ids(orderThreadTasks(list));
    expect(once).toEqual(['first', 'second']);
    expect(ids(orderThreadTasks(orderThreadTasks(list)))).toEqual(once);
  });

  test('does not mutate the list it is given', () => {
    const list = [task({ id: 'p3', priority: 'P3' }), task({ id: 'p1', priority: 'P1' })];
    orderThreadTasks(list);
    expect(ids(list)).toEqual(['p3', 'p1']);
  });
});
