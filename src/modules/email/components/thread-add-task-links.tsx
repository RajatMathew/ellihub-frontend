import type { ElliotTaskDraft } from '@/modules/email/schemas/elliot-reading.schema';

/**
 * The Tasks row's "+ Add task". When Elliot drafted a task from the thread's newest email, the
 * New Task form opens prefilled with it — title, notes, due date, priority — and the form's
 * header says so. The draft is only a starting point: nothing is created until the person saves.
 */
export function ThreadAddTaskLinks({
  draft,
  onAdd,
}: {
  draft: ElliotTaskDraft | null;
  onAdd: (withDraft: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="cursor-pointer text-[13px] font-medium text-link hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      title={draft ? `Prefilled by Elliot: ${draft.title}` : undefined}
      onClick={() => onAdd(Boolean(draft))}
    >
      + Add task
      {draft && <span className="sr-only">(prefilled by Elliot)</span>}
    </button>
  );
}
