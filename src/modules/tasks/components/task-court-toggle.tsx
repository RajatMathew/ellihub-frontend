import { Button } from '@/app/components/ui/button';
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
      <span className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
      <span
        className={cn(
          'text-xs font-bold underline-offset-4',
          // Underlined on hover rather than tinted behind, as the design draws
          // it - the label is the control, so the line belongs on the words and
          // in their own colour. Driven from the button so pointing anywhere on
          // it underlines, including the dot's half.
          'group-hover/court:underline group-focus-visible/court:underline',
          tone.text
        )}
      >
        {tone.label}
      </span>
    </>
  );

  if (!onChange) {
    return <span className="flex items-center gap-1.5">{body}</span>;
  }

  const next: TaskCourt = court === 'OURS' ? 'THEIRS' : 'OURS';

  return (
    <Button
      type="button"
      variant="inverse"
      size="sm"
      disabled={disabled}
      onClick={() => onChange(next)}
      // See TaskPriorityMeter: the whole card is a drag handle.
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${tone.label}. Hand over to ${TASK_COURT_TONES[next].label.toLowerCase()}`}
      className="group/court -mx-1 h-auto w-fit gap-1.5 px-1 py-1 hover:bg-transparent"
    >
      {body}
    </Button>
  );
}
