import type { TaskCourt, TaskEntityType, TaskPriority } from '@/modules/tasks/schemas/task.schema';

// `tone` is the dot beside the option in the dialog's segmented control. The
// priority tones are the ones the board card's badge already uses, so a P3 reads
// the same in the dialog as it does on the board. Class names rather than hexes,
// the way TASK_COLUMN_TONES does it in lib/task-board.ts.
export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  short: string;
  tone: string;
}[] = [
  { value: 'P1', label: 'P1 — Highest', short: 'P1', tone: 'bg-destructive' },
  { value: 'P2', label: 'P2 — Medium', short: 'P2', tone: 'bg-warning' },
  { value: 'P3', label: 'P3 — Lowest', short: 'P3', tone: 'bg-muted-foreground' },
];

// "Whose court is the ball in" — whether we owe the next move or they do.
export const TASK_COURT_OPTIONS: { value: TaskCourt; label: string; tone: string }[] = [
  { value: 'OURS', label: 'Ours', tone: 'bg-primary' },
  { value: 'THEIRS', label: 'Theirs', tone: 'bg-muted-foreground' },
];

export const TASKS_DEFAULT_PAGE_SIZE = 25;

export const TASK_ENTITY_LABELS: Record<TaskEntityType, string> = {
  project: 'Project',
  rfq: 'RFQ',
  purchaseOrder: 'PO',
  primeChangeOrder: 'PCO',
  subChangeOrder: 'SCO',
  invoice: 'Invoice',
};
