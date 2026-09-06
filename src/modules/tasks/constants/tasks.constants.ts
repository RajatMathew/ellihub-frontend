import type { TaskCourt, TaskEntityType, TaskPriority } from '@/modules/tasks/schemas/task.schema';

// `tone` is the dot beside the option in the dialog's segmented control — a red,
// orange, gold ramp, so the three read as steps of one scale rather than three
// unrelated colours. Class names rather than hexes, the way TASK_COLUMN_TONES
// does it in lib/task-board.ts.
export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  short: string;
  tone: string;
}[] = [
  { value: 'P1', label: 'P1 — Highest', short: 'P1', tone: 'bg-destructive' },
  { value: 'P2', label: 'P2 — Medium', short: 'P2', tone: 'bg-caution' },
  { value: 'P3', label: 'P3 — Lowest', short: 'P3', tone: 'bg-warning' },
];

// "Whose court is the ball in" — whether we owe the next move or they do.
export const TASK_COURT_OPTIONS: { value: TaskCourt; label: string; tone: string }[] = [
  { value: 'OURS', label: 'Ours', tone: 'bg-primary' },
  { value: 'THEIRS', label: 'Theirs', tone: 'bg-muted-foreground' },
];

// How the card draws a priority: the meter's filled bars and its label share one
// colour, so the level reads at a glance without the label being parsed. Their
// own ramp rather than `destructive`/`warning` — see the note beside
// `--priority-high` in the theme files.
export const TASK_PRIORITY_TONES: Record<TaskPriority, { bar: string; text: string }> = {
  P1: { bar: 'bg-priority-high', text: 'text-priority-high' },
  P2: { bar: 'bg-priority-medium', text: 'text-priority-medium' },
  P3: { bar: 'bg-priority-low', text: 'text-priority-low' },
};

// The card names the court in full — "Our court" reads on its own, where a
// filled-vs-empty pair needed both halves present to be understood.
export const TASK_COURT_TONES: Record<TaskCourt, { dot: string; text: string; label: string }> = {
  OURS: { dot: 'bg-court-ours', text: 'text-court-ours', label: 'Our court' },
  THEIRS: { dot: 'bg-court-theirs', text: 'text-court-theirs', label: 'Their court' },
};

/**
 * How long the completion circle holds its fill before the card leaves.
 *
 * Long enough to register, short enough not to feel like lag - about the length
 * of a blink. See elli-ui#829.
 */
export const TASK_COMPLETION_BEAT_MS = 200;

export const TASKS_DEFAULT_PAGE_SIZE = 25;

export const TASK_ENTITY_LABELS: Record<TaskEntityType, string> = {
  project: 'Project',
  rfq: 'RFQ',
  purchaseOrder: 'PO',
  primeChangeOrder: 'PCO',
  subChangeOrder: 'SCO',
  invoice: 'Invoice',
};
