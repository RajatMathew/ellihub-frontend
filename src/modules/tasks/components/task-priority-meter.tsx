import { cn } from '@/app/lib/utils';
import { TASK_PRIORITY_TONES } from '@/modules/tasks/constants/tasks.constants';
import type { TaskPriority } from '@/modules/tasks/schemas/task.schema';

/** P1 is three bars, P3 is one — the ramp reads before the label does. */
const FILLED_BARS: Record<TaskPriority, number> = { P1: 3, P2: 2, P3: 1 };

const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'];

/**
 * Priority as a signal-strength meter, and the control that changes it.
 *
 * No shadcn primitive draws a three-step meter, and the design wants the bars
 * rather than a badge — the height carries the level even where colour cannot.
 * The bars are spans rather than an icon so the filled ones can take the
 * priority's own colour while the rest stay grey.
 *
 * Clicking cycles P1 -> P2 -> P3 -> P1. The ticket asks for priority to change
 * from the card "without opening a separate menu", and with three values a cycle
 * is fewer actions than a menu for every change.
 */
export function TaskPriorityMeter({
  priority,
  disabled = false,
  onChange,
}: {
  priority: TaskPriority;
  disabled?: boolean;
  /** Omit to render the meter as a plain label rather than a control. */
  onChange?: (next: TaskPriority) => void;
}) {
  const tone = TASK_PRIORITY_TONES[priority];
  const filled = FILLED_BARS[priority];

  const meter = (
    <>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={height}
            className={cn(
              'w-1 rounded-[1px]',
              height,
              index < filled ? tone.bar : 'bg-muted-foreground/25'
            )}
          />
        ))}
      </span>
      <span className={cn('text-xs font-semibold', tone.text)}>{priority}</span>
    </>
  );

  if (!onChange) {
    return <span className="flex items-center gap-1.5">{meter}</span>;
  }

  const next: TaskPriority = priority === 'P1' ? 'P2' : priority === 'P2' ? 'P3' : 'P1';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      // The card is a drag handle, so dnd-kit's sensor claims pointerdown before
      // the click ever lands. Keeping the event stops the drag starting here.
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`Priority ${priority}. Change to ${next}`}
      className="-m-1 flex w-fit items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
    >
      {meter}
    </button>
  );
}
