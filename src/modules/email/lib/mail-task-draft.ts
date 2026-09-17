import {
  DEFAULT_DUE_TIME,
  toTaskPayload,
} from '@/modules/tasks/components/task-form/task-form-values';
import type { CreateTaskInput, TaskPriority } from '@/modules/tasks/schemas/task.schema';

export type MailTaskDraft = {
  text: string;
  priority: TaskPriority;
  /** `yyyy-mm-dd`, as a date input produces it. */
  dueDate: string;
};

/** `yyyy-mm-dd` for a day in the reader's own timezone, which is what a date input wants. */
export function taskDateInputValue(day: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/**
 * Whether this draft can be saved.
 *
 * A due date is not optional. The board has no "No due date" column — see the
 * comment on `taskFormSchema` — so the API rejects a task without one. The
 * popover offered the date as optional, which meant Add task answered with
 * "Due at: A due date is required" and left the typed draft in a popover that
 * never closed.
 */
export function canSaveMailTaskDraft(draft: MailTaskDraft): boolean {
  return draft.text.trim().length > 0 && draft.dueDate.length > 0;
}

/** The draft as the task API wants it. Callers must check `canSaveMailTaskDraft` first. */
export function mailTaskDraftToPayload(draft: MailTaskDraft): CreateTaskInput {
  return toTaskPayload({
    title: draft.text.trim(),
    description: '',
    priority: draft.priority,
    court: 'OURS',
    dueDate: draft.dueDate,
    dueTime: DEFAULT_DUE_TIME,
    assigneeId: '',
  });
}
