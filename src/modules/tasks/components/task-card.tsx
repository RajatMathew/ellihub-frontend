import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeMenu } from '@/modules/tasks/components/task-assignee-menu';
import { TaskCardEmailSources } from '@/modules/tasks/components/task-card-email-sources';
import { TaskCompletionRing } from '@/modules/tasks/components/task-completion-ring';
import { TaskCourtToggle } from '@/modules/tasks/components/task-court-toggle';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import { TASK_ENTITY_LABELS } from '@/modules/tasks/constants/tasks.constants';
import type { Task, TaskCourt, TaskPriority } from '@/modules/tasks/schemas/task.schema';
import { differenceInCalendarDays, format } from 'date-fns';
import { Check, Clock } from 'lucide-react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * What the card says about the deadline.
 *
 * Near dates are named rather than dated — "due today" beats "Wed, Sep 3" on a
 * card sitting in a column headed "Due Today, Sep 3", where the date is already
 * on screen. Only dates far enough out to be genuinely ambiguous get written.
 */
function dueLabel(task: Task, now: Date): { text: string; tone: string } | null {
  if (!task.dueAt) return null;

  const days = differenceInCalendarDays(new Date(task.dueAt), now);

  if (days < 0) {
    return { text: `overdue ${Math.abs(days)}d`, tone: 'text-priority-high' };
  }
  if (days === 0) return { text: 'due today', tone: 'text-priority-medium' };
  if (days === 1) return { text: 'due tomorrow', tone: 'text-court-ours' };

  return { text: format(new Date(task.dueAt), 'MMM d'), tone: 'text-muted-foreground' };
}

export function TaskCard({
  task,
  now = new Date(),
  isBusy = false,
  justLanded = false,
  onOpen,
  onComplete,
  onShiftDueDate,
  onReassign,
  onPriorityChange,
  onCourtChange,
}: {
  task: Task;
  now?: Date;
  isBusy?: boolean;
  /** Just changed column, so ring it briefly to show where it went. */
  justLanded?: boolean;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReassign: (assigneeId: string | null) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
  onCourtChange?: (court: TaskCourt) => void;
}) {
  const due = dueLabel(task, now);
  const isDone = task.status === 'COMPLETED';

  // Saves on the click, both ways. The tick used to hold a filled circle for a
  // beat before the card left (#829), from when leaving was a jump; now the
  // card fades out where it sat and slides into Completed (#862), that motion
  // already says "done", and the hold only read as the click waiting.
  const handleComplete = () => onComplete(task);

  return (
    // `group` is what lets +1 day appear on hover: it is in the tree the whole
    // time, so the layout never shifts, and it is revealed on focus too — a
    // control only a mouse can reach is a control a keyboard cannot.
    //
    // Redrawn from the tasks-card-redesign artifact: priority now reads
    // directly above the title rather than beside the court at the foot, so
    // the two things that describe *what this task is* — how urgent, what it
    // is called — sit together, and the foot is left to court and deadline,
    // the two things that describe *where it stands*.
    <div
      // What useEqualCardHeights measures, and the minimum it hands back: every
      // card on the board is as tall as the tallest, the tail block pinned to
      // the bottom edge so the spare height opens above it.
      data-task-card
      className={cn(
        'group flex min-h-(--task-card-height) flex-col rounded-xl border border-border bg-card px-4 pb-[13px] pt-[15px]',
        isDone && 'opacity-60',
        // Reduced motion gets the same ring, held plainly for as long as the
        // flag is set, rather than a fade. Deciding here rather than in CSS
        // because Tailwind emits the theme's keyframes after any media block
        // that would try to override them.
        justLanded && (prefersReducedMotion() ? 'ring-2 ring-success' : 'animate-task-landed')
      )}
    >
      {/* The circle and the card's ownership share the header. The circle is
          the one control that moves the card out of the board entirely, so it
          leads; the envelope and the assignee chip trail at the far edge. */}
      <div className="mb-[9px] flex items-center justify-between">
        {/* A real checkbox rather than a button carrying a label: completion is
            a two-state fact about the task, so Radix's role and aria-checked say
            so and space toggles it. Only the shape is ours - the design draws a
            dashed ring where the primitive draws a square. */}
        <span className="relative inline-flex shrink-0">
          <Checkbox
            checked={isDone}
            disabled={isBusy}
            onCheckedChange={handleComplete}
            // See TaskPriorityMeter: the whole card is a drag handle.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
            className={cn(
              'size-5 shrink-0 cursor-pointer rounded-full border-2 [&_svg]:size-3',
              isDone &&
                'border-success data-[state=checked]:border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground',
              // While open the border is transparent: TaskCompletionRing below
              // draws the dashes in its place.
              !isDone && 'border-transparent'
            )}
          />

          {/* A ghost of the tick, shown while the circle is pointed at or
              tabbed to. An empty dashed ring does not say what it does; the mark
              it would leave does. Radix mounts the real indicator only once
              checked, so this is a sibling rather than a state of it - the
              variant already sets `peer`, which is what it listens to.

              Hidden from the accessibility tree: the checkbox itself already
              announces what pressing it does. */}
          {!isDone ? (
            <Check
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto size-3 text-success opacity-0 transition-opacity peer-hover:opacity-50 peer-focus-visible:opacity-50"
            />
          ) : null}

          {/* Seven dashes, not CSS's dozen. A sibling rather than a child so the
              checkbox's own svg sizing cannot shrink it; it follows the peer for
              hover and focus the way the ghost tick above does. After the
              ghost, which the beat spec finds as the checkbox's next sibling. */}
          {!isDone ? (
            <TaskCompletionRing className="text-muted-foreground/40 transition-colors peer-hover:text-success peer-focus-visible:text-success" />
          ) : null}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <TaskCardEmailSources references={task.emailReferences} />
          <TaskAssigneeMenu task={task} disabled={isBusy} onReassign={onReassign} />
        </div>
      </div>

      {/* Priority sits right above the title it describes, rather than beside
          the court down at the foot — the two together are "what this task
          is", read before anything else on the card. */}
      <div className="mb-2">
        <TaskPriorityMeter
          priority={task.priority}
          disabled={isBusy}
          onChange={onPriorityChange ? (next) => onPriorityChange(next) : undefined}
        />

        {/* Raw rather than `Button`: the title wraps to three lines at this
            column width, and Button is a fixed-height, nowrap, centred control
            - undoing all of that leaves nothing of the primitive behind. */}
        <button
          type="button"
          onClick={() => onOpen(task)}
          onPointerDown={(event) => event.stopPropagation()}
          title={task.title}
          className="mt-1.5 block w-full cursor-pointer text-start font-serif text-[17px] font-semibold leading-[1.3] tracking-[-0.005em] text-foreground hover:underline"
        >
          {/* Three lines, then an ellipsis. Cards share the tallest card's
              height, so an unbounded title would set the whole board's. The
              dialog has the full text; so does the tooltip. */}
          <span className={cn('line-clamp-3 break-words', isDone && 'line-through')}>
            {task.title}
          </span>
        </button>
      </div>

      {task.description ? (
        <p className="mb-3 line-clamp-2 text-[13px] leading-[1.45] break-words text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      {task.entityLinks.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.entityLinks.map((link) => (
            <Badge
              key={`${link.entityType}-${link.entityId}`}
              variant="secondary"
              appearance="light"
              size="sm"
              className="rounded-sm uppercase tracking-wide"
            >
              {TASK_ENTITY_LABELS[link.entityType]} · {link.entityId}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Court and deadline: what stage the task is at now, pinned to the
          card's bottom edge so every card in a row lines its foot up with the
          next regardless of how much body sits above. Only the deadline row
          is ruled off — the court is a fact about the task, the deadline (and
          its nudge) is the one line that is also a countdown. */}
      <div className="mt-auto flex flex-col">
        <div className="mb-3">
          <TaskCourtToggle
            court={task.court}
            disabled={isBusy}
            onChange={onCourtChange ? (next) => onCourtChange(next) : undefined}
          />
        </div>

        {due ? (
          <div className="flex items-center gap-2 border-t border-border/50 pt-[11px]">
            <span
              className={cn('inline-flex items-center gap-1 text-[12.5px] font-semibold', due.tone)}
            >
              <Clock className="size-3" aria-hidden />
              {due.text}
            </span>

            {!isDone ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onShiftDueDate(task, 1)}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="+1 day"
                // Hidden until the card is hovered or something inside it is
                // focused, as the design has it - but never hidden from a
                // keyboard, and always shown on touch, where there is no hover.
                className="shrink-0 cursor-pointer text-xs font-bold text-info opacity-0 transition-opacity hover:underline focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
              >
                +1 day
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
