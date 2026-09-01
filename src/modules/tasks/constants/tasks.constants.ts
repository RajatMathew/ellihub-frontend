import type { TaskCourt, TaskPriority } from '@/modules/tasks/schemas/task.schema';

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'P1', label: 'P1 — Highest' },
  { value: 'P2', label: 'P2 — Medium' },
  { value: 'P3', label: 'P3 — Lowest' },
];

// "Whose court is the ball in" — whether we owe the next move or they do.
export const TASK_COURT_OPTIONS: { value: TaskCourt; label: string }[] = [
  { value: 'OURS', label: 'Ours' },
  { value: 'THEIRS', label: 'Theirs' },
];

export const TASKS_DEFAULT_PAGE_SIZE = 25;
