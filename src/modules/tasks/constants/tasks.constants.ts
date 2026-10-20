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
// `--priority-high` in the theme files. `bar` is a `fill-*` utility — the bars
// are SVG rects, not filled divs.
export const TASK_PRIORITY_TONES: Record<TaskPriority, { bar: string; text: string }> = {
  P1: { bar: 'fill-priority-high', text: 'text-priority-high' },
  P2: { bar: 'fill-priority-medium', text: 'text-priority-medium' },
  P3: { bar: 'fill-priority-low', text: 'text-priority-low' },
};

// The card names the court in full — "Our court" reads on its own, where a
// filled-vs-empty pair needed both halves present to be understood. `soft` is
// the dot's halo and the button's hover fill, as the TaskCard design draws it.
export const TASK_COURT_TONES: Record<
  TaskCourt,
  { dot: string; halo: string; text: string; soft: string; label: string }
> = {
  OURS: {
    dot: 'bg-court-ours',
    halo: 'ring-court-ours-soft',
    text: 'text-court-ours',
    soft: 'hover:bg-court-ours-soft focus-visible:bg-court-ours-soft',
    label: 'Our court',
  },
  THEIRS: {
    dot: 'bg-court-theirs',
    halo: 'ring-court-theirs-soft',
    text: 'text-court-theirs',
    soft: 'hover:bg-court-theirs-soft focus-visible:bg-court-theirs-soft',
    label: 'Their court',
  },
};

export const TASK_ENTITY_LABELS: Record<TaskEntityType, string> = {
  project: 'Project',
  rfq: 'RFQ',
  purchaseOrder: 'PO',
  primeChangeOrder: 'Prime CO',
  subChangeOrder: 'SCO',
  invoice: 'Invoice',
};

// How many of an email's linked records the card lists under it before folding
// the rest behind "+N more". One, like the emails: a thread tagged to seven jobs
// must not set the height of every card on its row.
export const TASK_CARD_LINKED_ITEM_LIMIT = 1;
