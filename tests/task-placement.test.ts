import { describe, expect, test } from 'bun:test';

import { placeTask, type PlacementApi } from '../src/modules/tasks/lib/task-placement';
import type { Task } from '../src/modules/tasks/schemas/task.schema';

const task = { id: 'card' } as Task;
const placed = { task, touched: [] };

/** A fake API that records the order of calls and can be told to fail. */
function fakeApi(failures: { complete?: boolean; reorder?: boolean } = {}) {
  const calls: string[] = [];
  const api: PlacementApi = {
    setCompleted: (_id, completed) => {
      calls.push(completed ? 'complete' : 'reopen');
      return failures.complete && !completed
        ? Promise.reject(new Error('reopen failed'))
        : Promise.resolve(task);
    },
    reorder: () => {
      calls.push('place');
      return failures.reorder ? Promise.reject(new Error('place refused')) : Promise.resolve(placed);
    },
  };
  return { api, calls };
}

const request = { id: 'card', previousId: 'a', nextId: 'b', dueAt: '2026-09-12T14:00:00.000Z' };

describe('placing a card dragged out of Completed', () => {
  test('reopens, and only then places', async () => {
    const { api, calls } = fakeApi();

    await placeTask(api, { ...request, reopen: true });

    expect(calls).toEqual(['reopen', 'place']);
  });

  test('a failed reopen sends nothing else', async () => {
    const { api, calls } = fakeApi({ complete: true });

    await expect(placeTask(api, { ...request, reopen: true })).rejects.toThrow('reopen failed');
    expect(calls).toEqual(['reopen']);
  });

  test('a refused placement undoes the reopen and reports the refusal', async () => {
    const { api, calls } = fakeApi({ reorder: true });

    await expect(placeTask(api, { ...request, reopen: true })).rejects.toThrow('place refused');
    expect(calls).toEqual(['reopen', 'place', 'complete']);
  });
});

describe('placing a card within the open columns', () => {
  test('never touches the completion status', async () => {
    const { api, calls } = fakeApi();

    await placeTask(api, request);

    expect(calls).toEqual(['place']);
  });

  test('a refused placement is reported as is', async () => {
    const { api, calls } = fakeApi({ reorder: true });

    await expect(placeTask(api, request)).rejects.toThrow('place refused');
    expect(calls).toEqual(['place']);
  });
});
