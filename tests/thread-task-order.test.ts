import { describe, expect, test } from 'bun:test';

import {
  orderThreadTasks,
  splitThreadTasks,
  THREAD_TASK_VISIBLE_LIMIT,
} from '../src/modules/tasks/lib/thread-task-order';
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

describe('how many of a thread’s tasks the panel shows (elli-ui#1078)', () => {
  const many = Array.from({ length: 14 }, (_, index) => `task-${index}`);

  test('a short list is shown whole, with nothing to unfold', () => {
    const list = ['a', 'b', 'c'];
    expect(splitThreadTasks(list, false)).toEqual({ visible: list, hiddenCount: 0 });
  });

  test('a list exactly at the limit does not offer a show-more', () => {
    // The off-by-one that would render "Show 0 more".
    const list = many.slice(0, THREAD_TASK_VISIBLE_LIMIT);
    expect(splitThreadTasks(list, false).hiddenCount).toBe(0);
  });

  test('a long list is cut, and says how many are hiding', () => {
    // The panel is sticky, so an uncapped list of fourteen made it taller than
    // the pane and the mail behind it hard to reach.
    const { visible, hiddenCount } = splitThreadTasks(many, false);
    expect(visible).toHaveLength(THREAD_TASK_VISIBLE_LIMIT);
    expect(hiddenCount).toBe(many.length - THREAD_TASK_VISIBLE_LIMIT);
    expect(visible[0]).toBe('task-0');
  });

  test('expanding shows every one of them', () => {
    expect(splitThreadTasks(many, true)).toEqual({ visible: many, hiddenCount: 0 });
  });

  test('keeps the order it was given — the worst stay at the top', () => {
    // It slices rather than re-sorts, so the five on show are the five
    // orderThreadTasks put first, not an arbitrary five.
    expect(splitThreadTasks(many, false).visible).toEqual(many.slice(0, 5));
  });

  test('does not hand back the array it was given', () => {
    const list = ['a', 'b'];
    expect(splitThreadTasks(list, false).visible).not.toBe(list);
  });
});
