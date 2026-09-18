import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { TASK_PRIORITY_TONES } from '@/modules/tasks/constants/tasks.constants';
import type { TaskPriority } from '@/modules/tasks/schemas/task.schema';

/** P1 is three bars, P3 is one — the ramp reads before the label does. */
const FILLED_BARS: Record<TaskPriority, number> = { P1: 3, P2: 2, P3: 1 };

const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'];

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3'];

/**
 * The bars and the label, drawn once so the badge on the card and the rows in
 * its menu cannot drift apart.
 */
function PriorityGlyph({ priority }: { priority: TaskPriority }) {
  const tone = TASK_PRIORITY_TONES[priority];
  const filled = FILLED_BARS[priority];

  return (
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
}

/**
 * Priority as a signal-strength meter, and the control that changes it.
 *
 * No shadcn primitive draws a three-step meter, and the design wants the bars
 * rather than a badge — the height carries the level even where colour cannot.
 * The bars are spans rather than an icon so the filled ones can take the
 * priority's own colour while the rest stay grey.
 *
 * Clicking opens a menu of all three, the current one marked, as the design
 * draws it. It used to cycle P1 -> P2 -> P3 -> P1 instead; a menu is one pick
 * for any change where the cycle cost two clicks — and two saves — to go from
 * P1 to P3.
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
  if (!onChange) {
    return (
      <span className="flex items-center gap-1.5">
        <PriorityGlyph priority={priority} />
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="inverse"
          size="sm"
          // The card is a drag handle, so dnd-kit's sensor claims pointerdown
          // before Radix sees it and the click falls through to the card.
          // Keeping the event stops the drag starting here.
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Priority ${priority}. Change priority`}
          className="-mx-1 h-auto w-fit gap-1.5 px-1 py-1 hover:bg-surface-hover data-[state=open]:bg-surface-hover"
        >
          <PriorityGlyph priority={priority} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-28">
        <DropdownMenuRadioGroup
          value={priority}
          // Radix reports every pick, including the one already set; that one
          // is not a change and must not become a save.
          onValueChange={(next) => {
            if (next !== priority) onChange(next as TaskPriority);
          }}
        >
          {PRIORITIES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} className="gap-1.5">
              <PriorityGlyph priority={option} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
