import { toDateOnly } from '@/app/lib/dates';
import type { CreateTaskInput, Task, TaskFormData } from '@/modules/tasks/schemas/task.schema';

/**
 * The conversion between a task and the fields that edit it.
 *
 * Separate from the components because both the dialog and the email popover
 * make a task, and a second copy of `toPayload` is a second place for the
 * dueAt/dueHasTime pairing to be got subtly wrong.
 */

const pad = (value: number) => String(value).padStart(2, '0');

export const dateInputValue = (date: Date) => toDateOnly(date) ?? '';

// End of business. Any default is a guess; this one is at least the same guess
// every time, which beats "whatever o'clock it happened to be".
export const DEFAULT_DUE_TIME = '17:00';

/**
 * A function rather than a constant: the due date defaults to today, and a tab
 * left open overnight would otherwise keep offering yesterday.
 *
 * `title` is seeded where there is an obvious first draft of it — an email's
 * subject, raising a task from the message.
 */
export const emptyTaskFormValues = (title = ''): TaskFormData => ({
  title,
  description: '',
  priority: 'P3',
  court: 'OURS',
  // TEMPORARILY defaulted — the date and time are both required while the
  // "No due date" column is disabled, so a new task opens on today at the close
  // of business rather than empty. Restore '' for both when it comes back.
  dueDate: dateInputValue(new Date()),
  dueTime: DEFAULT_DUE_TIME,
  assigneeId: '',
});

// The API stores one instant; the form holds the day and the time separately
// because that is what the two native inputs produce.
export function toTaskFormValues(task?: Task | null): TaskFormData {
  if (!task) return emptyTaskFormValues();

  const due = task.dueAt ? new Date(task.dueAt) : null;

  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    court: task.court,
    dueDate: due ? dateInputValue(due) : '',
    dueTime:
      due && task.dueHasTime ? `${pad(due.getHours())}:${pad(due.getMinutes())}` : DEFAULT_DUE_TIME,
    assigneeId: task.assigneeId ?? '',
  };
}

export function toTaskPayload(values: TaskFormData): CreateTaskInput {
  // No date means no deadline. A date without a time means the whole day, which
  // we anchor at midnight local and flag with dueHasTime so the card knows not
  // to render a clock.
  const dueAt = values.dueDate
    ? new Date(`${values.dueDate}T${values.dueTime || '00:00'}`).toISOString()
    : null;

  return {
    title: values.title,
    description: values.description ? values.description : null,
    priority: values.priority,
    court: values.court,
    dueAt,
    dueHasTime: Boolean(values.dueDate && values.dueTime),
    assigneeId: values.assigneeId ? values.assigneeId : null,
  };
}
