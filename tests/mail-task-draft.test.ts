import { describe, expect, test } from 'bun:test';

import {
  canSaveMailTaskDraft,
  mailTaskDraftToPayload,
  taskDateInputValue,
} from '../src/modules/email/lib/mail-task-draft';

const draft = (over: Partial<Parameters<typeof canSaveMailTaskDraft>[0]> = {}) => ({
  text: 'Confirm the veneer sample',
  priority: 'P2' as const,
  dueDate: '2026-09-17',
  ...over,
});

describe('raising a task from a mail', () => {
  test('refuses a draft with no due date', () => {
    // The bug: the popover let this through, the API answered "Due at: A due
    // date is required", and the typed draft sat in a popover that never closed.
    expect(canSaveMailTaskDraft(draft({ dueDate: '' }))).toBe(false);
  });

  test('refuses a draft that is only whitespace', () => {
    expect(canSaveMailTaskDraft(draft({ text: '   ' }))).toBe(false);
  });

  test('accepts a draft with text and a date', () => {
    expect(canSaveMailTaskDraft(draft())).toBe(true);
  });

  test('always sends a due date the API will take', () => {
    const payload = mailTaskDraftToPayload(draft());
    expect(payload.dueAt).not.toBeNull();
    expect(new Date(payload.dueAt as string).getFullYear()).toBe(2026);
    expect(payload.dueHasTime).toBe(true);
  });

  test('trims the title and keeps the priority', () => {
    const payload = mailTaskDraftToPayload(draft({ text: '  Chase the quote  ', priority: 'P1' }));
    expect(payload.title).toBe('Chase the quote');
    expect(payload.priority).toBe('P1');
  });

  test('formats a date for the input in local time, not UTC', () => {
    // A `toISOString().slice(0, 10)` here lands on the previous day for anyone
    // west of UTC after their local afternoon.
    expect(taskDateInputValue(new Date(2026, 8, 17, 23, 30))).toBe('2026-09-17');
    expect(taskDateInputValue(new Date(2026, 0, 5, 0, 15))).toBe('2026-01-05');
  });
});
