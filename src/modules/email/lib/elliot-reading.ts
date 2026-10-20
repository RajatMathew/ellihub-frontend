import type {
  ElliotTaskDraft,
  EmailAiSuggestion,
} from '@/modules/email/schemas/elliot-reading.schema';
import type { TaskFormData } from '@/modules/tasks/schemas/task.schema';

/**
 * Elliot's reading of a thread, as the panel uses it. elli-core has already written the court
 * and confident links onto an unfiled thread, so the panel's own fields show them; what is
 * left here is outlining the card while it still shows Elliot's filing, and the New Task form a drafted task
 * prefills. Pure, so each decision is tested on its own.
 */

/**
 * Whether the panel has any use for the reading: Elliot filed the thread itself (the card is
 * outlined), or drafted a task for "+ Add task" to prefill. A reading that only names
 * the kind of email changes nothing on screen.
 */
export function readingWorthShowing(reading: EmailAiSuggestion): boolean {
  return Boolean(reading.appliedAt || reading.task);
}

/** Whether Elliot filed this thread itself. */
export function readingFilledThread(reading: EmailAiSuggestion | null | undefined): boolean {
  return Boolean(reading?.appliedAt);
}

/** How a linked record is told apart: by its entity, not its label (which can be renamed). */
const recordKey = (entityType: string | null | undefined, entityId: string | null | undefined) =>
  `${entityType ?? ''}:${entityId ?? ''}`;

/**
 * Whether the thread still shows exactly what Elliot filed, so the details card keeps its blue
 * "this came from Elliot" border. Only on a thread Elliot filed, and only while nobody has
 * assigned it, moved its court off the one Elliot set, or added or removed a link — the links
 * must be exactly the ones Elliot was sure enough to fill in. Read from the thread's own values
 * rather than a click, so a reload does not bring the border back over a person's change.
 */
export function elliotFilingUntouched(
  reading: EmailAiSuggestion | null | undefined,
  thread: {
    status: string;
    assignedTo?: unknown;
    references: ReadonlyArray<{ entityType?: string | null; entityId?: string | null }>;
  }
): boolean {
  if (!reading?.appliedAt) return false;
  if (thread.assignedTo) return false;
  if (reading.court && reading.court !== thread.status) return false;
  const filed = new Set(
    reading.links
      .filter((link) => link.confident)
      .map((link) => recordKey(link.entityType, link.entityId))
  );
  const current = new Set(
    thread.references.map((reference) => recordKey(reference.entityType, reference.entityId))
  );
  return filed.size === current.size && [...filed].every((key) => current.has(key));
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The New Task form, prefilled from Elliot's draft. A field the draft leaves out keeps the
 * form's own default — a task with no stated deadline opens on the form's usual due date, for
 * the person to set. The court follows whose court Elliot read the thread to be in.
 */
export function taskDraftFormValues(
  draft: ElliotTaskDraft,
  court: EmailAiSuggestion['court']
): Partial<TaskFormData> {
  const values: Partial<TaskFormData> = {
    title: draft.title.slice(0, 200),
    description: draft.description ?? '',
    priority: draft.priority,
    court: court === 'open_their_court' ? 'THEIRS' : 'OURS',
  };
  if (draft.due_date && DATE_ONLY.test(draft.due_date)) values.dueDate = draft.due_date;
  const time = draft.due_time?.match(/^\d{2}:\d{2}/)?.[0];
  if (time) values.dueTime = time;
  return values;
}
