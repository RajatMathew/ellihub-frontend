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

/** The card draws priority as a soft pill beside the completion circle, sized
 *  to the TaskCard design (elli-ui#1479): 20px tall, a 7px corner. */
const PILL_CLASS =
  'inline-flex h-5 w-fit items-center gap-[5px] rounded-[7px] bg-task-chip pr-2 pl-[7px] leading-none';

/** P1 is three bars, P3 is one — the ramp reads before the label does. */
const FILLED_BARS: Record<TaskPriority, number> = { P1: 3, P2: 2, P3: 1 };

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3'];

/**
 * The bars and the label, drawn once so the badge on the card and the rows in
 * its menu cannot drift apart.
 *
 * The TaskCard design's own glyph (elli-ui#1479): three 2-unit bars on a 10x10
 * grid, stepping in height and never in width, every bar in the priority's own
 * colour and the unfilled ones at a quarter strength — so the shape reads as
 * "how full" independent of colour.
 */
function PriorityGlyph({ priority }: { priority: TaskPriority }) {
  const tone = TASK_PRIORITY_TONES[priority];
  const filled = FILLED_BARS[priority];

  return (
    <>
      <svg viewBox="0 0 10 10" className="size-[9px] shrink-0" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <rect
            key={index}
            x={index * 4}
            y={6 - index * 3}
            width={2}
            height={4 + index * 3}
            rx={1}
            className={cn(tone.bar, index >= filled && 'opacity-25')}
          />
        ))}
      </svg>
      <span className={cn('text-[10.5px] font-semibold tracking-[0.03em]', tone.text)}>
        {priority}
      </span>
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
      <span className={PILL_CLASS}>
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
          // A soft pill beside the completion circle, as the task card design
          // draws it (elli-ui#1406); it darkens on hover and while open, which
          // is what says it opens a menu — the hidden chevron that used to
          // only left a gap inside the pill.
          className={cn(
            PILL_CLASS,
            'group/priority hover:bg-task-mail-hover data-[state=open]:bg-task-mail-hover'
          )}
        >
          <PriorityGlyph priority={priority} />
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
