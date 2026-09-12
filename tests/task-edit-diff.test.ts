import { describe, expect, test } from 'bun:test';

import {
  toTaskFormValues,
  toTaskPayload,
} from '../src/modules/tasks/components/task-form/task-form-values';
import { changedTaskFields } from '../src/modules/tasks/lib/task-edit';
import type { Task } from '../src/modules/tasks/schemas/task.schema';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    // An instant that is NOT local midnight and has no time set — the shape
    // the API and the board produce. The form cannot round-trip it exactly.
    dueAt: '2026-09-08T17:00:00.000Z',
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: 1_700_000_000_000,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  };
}

/** What the dialog submits when the form is opened on `original` and saved as-is. */
function untouchedSave(original: Task) {
  return toTaskPayload(toTaskFormValues(original));
}

// The bug this guards, from review on #293/#907: the edit dialog rebuilds the
// due date on every save — day from the picker, time defaulted — so an
// untouched date came back as a different instant, the server saw a real
// change, and the card lost its hand-placed position on a title-only edit.
// An update must carry only what the person actually changed.
describe('what an edit sends', () => {
  test('a title-only edit sends the title and nothing about the date', () => {
    const original = task();
    const saved = { ...untouchedSave(original), title: 'Chase it harder' };

    const sent = changedTaskFields(original, saved);

    expect(sent).toEqual({ title: 'Chase it harder' });
    expect(sent).not.toHaveProperty('dueAt');
    expect(sent).not.toHaveProperty('priority');
  });

  test('saving an untouched form sends nothing', () => {
    const original = task();

    expect(changedTaskFields(original, untouchedSave(original))).toEqual({});
  });

  test('a changed priority is sent', () => {
    const original = task();
    const saved = { ...untouchedSave(original), priority: 'P1' as const };

    expect(changedTaskFields(original, saved)).toEqual({ priority: 'P1' });
  });

  test('a date the person actually moved is sent', () => {
    const original = task();
    const form = toTaskFormValues(original);
    const saved = toTaskPayload({ ...form, dueDate: '2026-09-20' });

    const sent = changedTaskFields(original, saved);

    expect(sent).toHaveProperty('dueAt');
    expect(sent.dueAt).not.toBe(original.dueAt);
  });

  test('email references are compared by content, not identity', () => {
    const ref = { accountId: 'acc', providerId: 'msg-1' };
    const original = task({ emailReferences: [ref] });
    const saved = { ...untouchedSave(original), emailReferences: [{ ...ref }] };

    expect(changedTaskFields(original, saved)).toEqual({});
  });
});
