import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { TASK_PRIORITY_TONES } from '@/modules/tasks/constants/tasks.constants';
import type { TaskPriority } from '@/modules/tasks/schemas/task.schema';
import { ChevronDown } from 'lucide-react';

/** P1 is three bars, P3 is one — the ramp reads before the label does. */
const FILLED_BARS: Record<TaskPriority, number> = { P1: 3, P2: 2, P3: 1 };

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3'];

/** The three bars' `x`, `y` and `height` in the artifact's own 14x12 grid — a
 *  fixed width of 3 and `rx` of 1, so only the geometry that actually steps
 *  between bars is worth naming. */
const BARS = [
  { x: 0.5, y: 8, height: 4 },
  { x: 5.5, y: 5, height: 7 },
  { x: 10.5, y: 2, height: 10 },
];

/**
 * The bars and the label, drawn once so the badge on the card and the rows in
 * its menu cannot drift apart.
 *
 * The bars are the tasks-card-redesign artifact's own glyph, redrawn 1:1 as an
 * SVG rather than approximated with flex spans (elli-ui#1140) — three rects on
 * a 14x12 grid, stepping in height and never in width, filled with the
 * priority's own colour up to its level and with the theme's muted line past
 * it, so the shape reads as "how full" independent of colour.
 */
function PriorityGlyph({ priority }: { priority: TaskPriority }) {
  const tone = TASK_PRIORITY_TONES[priority];
  const filled = FILLED_BARS[priority];

  return (
    <>
      <svg viewBox="0 0 14 12" className="h-[11px] w-[14px] shrink-0" aria-hidden="true">
        {BARS.map((bar, index) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={bar.y}
            width={3}
            height={bar.height}
            rx={1}
            className={index < filled ? tone.bar : 'fill-muted-foreground/25'}
          />
        ))}
      </svg>
      <span className={cn('text-[11px] font-bold', tone.text)}>{priority}</span>
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
          // No fill at rest, on hover, or while the menu is open — the artifact
          // draws the trigger as bare bars and a label, with a chevron as the
          // only hint that it opens anything, not a chip with its own
          // background (elli-ui#1140).
          className="group/priority -mx-1 h-auto w-fit gap-1.5 px-1 py-1 hover:bg-transparent data-[state=open]:bg-transparent"
        >
          <PriorityGlyph priority={priority} />
          {/* Revealed on hover or focus, same as the artifact's `.pp-chevron`
              — a control that only ever shows a hint of itself until you are
              already pointed at it. */}
          <ChevronDown
            aria-hidden
            className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/priority:opacity-100 group-focus-visible/priority:opacity-100"
          />
        </Button>
      </DropdownMenuTrigger>

      {/* A plain list rather than `DropdownMenuRadioGroup`: the artifact draws
          each row as just the bars and the label, with no leading dot for the
          current value — the bars themselves already say which level a row is,
          so a second marker for which one is *selected* was a mark nothing in
          the design calls for. `onSelect` in place of `onValueChange` is the
          one behavioural cost - Radix radio items report every pick including
          the current one, which the old guard against a same-value "change"
          no longer needs, because a plain item can't be re-clicked into the
          value it already has without lying about a change happening. */}
      <DropdownMenuContent align="start" className="w-[110px] rounded-[10px] p-1.5">
        {PRIORITIES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => {
              if (option !== priority) onChange(option);
            }}
            className="gap-1.5"
          >
            <PriorityGlyph priority={option} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
