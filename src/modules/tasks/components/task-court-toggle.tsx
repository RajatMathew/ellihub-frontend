import { cn } from '@/app/lib/utils';
import { TASK_COURT_TONES } from '@/modules/tasks/constants/tasks.constants';
import type { TaskCourt } from '@/modules/tasks/schemas/task.schema';

/**
 * Whose move it is, and the control that hands it over.
 *
 * The card used to show both courts side by side with the live one filled in.
 * The design shows only the one in play, which is what a dot and a word can say
 * on a card this narrow — and since the label now changes rather than the fill,
 * the word carries the state on its own and the colour is reinforcement.
 *
 * No shadcn primitive fits: `Toggle` is a two-state button but draws a filled
 * pill, and `Badge` is not interactive.
 */
export function TaskCourtToggle({
  court,
  disabled = false,
  onChange,
}: {
  court: TaskCourt;
  disabled?: boolean;
  /** Omit to render as a plain label rather than a control. */
  onChange?: (next: TaskCourt) => void;
}) {
  const tone = TASK_COURT_TONES[court];

  const body = (
    <>
      <span className={cn('size-2 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
      <span className={cn('text-sm font-semibold', tone.text)}>{tone.label}</span>
    </>
  );

  if (!onChange) {
    return <span className="flex items-center gap-2">{body}</span>;
  }

  const next: TaskCourt = court === 'OURS' ? 'THEIRS' : 'OURS';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      // See TaskPriorityMeter: the whole card is a drag handle.
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${tone.label}. Hand over to ${TASK_COURT_TONES[next].label.toLowerCase()}`}
      className="-m-1 flex w-fit items-center gap-2 rounded-md p-1 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
    >
      {body}
    </button>
  );
}
