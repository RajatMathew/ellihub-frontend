import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
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
import { CalendarPlus, Check, Clock } from 'lucide-react';

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
    // Three bands, not seven rows. The card used to give the ring, the
    // priority, the title, the court and the deadline a row each, so a
    // one-word task was five stacked lines and mostly air. Now the ring and the
    // title share the top line with the chip, the body sits under the title,
    // and everything that is a fact about the task — priority, court, deadline
    // — is one ruled-off line at the foot.
    <div
      // What useEqualCardHeights measures, and the minimum it hands back: every
      // card on the board is as tall as the tallest, the footer pinned to the
      // bottom edge so the spare height opens under the body.
      data-task-card
      className={cn(
        'group flex min-h-(--task-card-height) flex-col gap-2 rounded-lg border border-border bg-card p-3',
        isDone && 'opacity-60',
        // Reduced motion gets the same ring, held plainly for as long as the
        // flag is set, rather than a fade. Deciding here rather than in CSS
        // because Tailwind emits the theme's keyframes after any media block
        // that would try to override them.
        justLanded && (prefersReducedMotion() ? 'ring-2 ring-success' : 'animate-task-landed')
      )}
    >
      {/* The circle, the title and the owner on one line. The circle is the one
          control that moves the card out of the board entirely, so it leads;
          the title takes the width between it and the chip and wraps beneath
          itself, never under the chip. */}
      <div className="flex items-start gap-2">
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
              'size-6 shrink-0 rounded-full border-2 [&_svg]:size-3.5',
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
              className="pointer-events-none absolute inset-0 m-auto size-3.5 text-success opacity-0 transition-opacity peer-hover:opacity-50 peer-focus-visible:opacity-50"
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

        {/* Raw rather than `Button`: the title wraps to three lines at this column
            width, and Button is a fixed-height, nowrap, centred control - undoing
            all of that leaves nothing of the primitive behind. `min-w-0` so a
            long unbroken word truncates the button rather than pushing the chip
            out of the card. The top padding sets the first line's centre on the
            circle's. */}
        <button
          type="button"
          onClick={() => onOpen(task)}
          onPointerDown={(event) => event.stopPropagation()}
          title={task.title}
          className="min-w-0 flex-1 pt-0.5 text-start font-serif text-base font-bold leading-snug text-foreground hover:underline"
        >
          {/* Three lines, then an ellipsis. Cards share the tallest card's
              height, so an unbounded title would set the whole board's. The
              dialog has the full text; so does the tooltip. */}
          <span className={cn('line-clamp-3 break-words', isDone && 'line-through')}>
            {task.title}
          </span>
        </button>

        {/* Provenance and ownership share the corner, as the design draws it:
            the envelope opens the emails the task was raised from, the chip
            says whose it is. Pulled up a touch so the chip's own padding does
            not push the row taller than the circle. */}
        <div className="-my-0.5 flex shrink-0 items-center gap-1">
          <TaskCardEmailSources references={task.emailReferences} />
          <TaskAssigneeMenu task={task} disabled={isBusy} onReassign={onReassign} />
        </div>
      </div>

      {/* The body hangs under the title, not under the circle: it continues the
          title, and a line that started flush with the ring read as a separate
          item. */}
      {task.description || task.entityLinks.length > 0 ? (
        <div className="flex flex-col gap-1.5 ps-8">
          {task.description ? (
            <p className="line-clamp-2 text-sm leading-snug break-words text-muted-foreground">
              {task.description}
            </p>
          ) : null}

          {task.entityLinks.length > 0 ? (
            <div className="flex flex-wrap gap-1">
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
        </div>
      ) : null}

      {/* Everything that is a fact about the task on one line, ruled off from
          its content by a faint line — half the theme's hairline, so it
          separates rather than divides. Priority and court sit together at the
          start; the deadline and its nudge at the end.

          Sized to fit the narrowest column: everything is text-xs, and the
          nudge is an icon rather than the words "+1 day", which with the
          deadline beside it pushed the row onto two lines in every card. The
          row still wraps rather than clips, as a last resort for the longest
          labels at the minimum width. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/50 pt-2">
        <div className="flex items-center gap-3">
          <TaskPriorityMeter
            priority={task.priority}
            disabled={isBusy}
            onChange={onPriorityChange ? (next) => onPriorityChange(next) : undefined}
          />
          <TaskCourtToggle
            court={task.court}
            disabled={isBusy}
            onChange={onCourtChange ? (next) => onCourtChange(next) : undefined}
          />
        </div>

        {due ? (
          <div className="flex items-center gap-1.5">
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', due.tone)}>
              <Clock className="size-3.5" aria-hidden />
              {due.text}
            </span>

            {!isDone ? (
              <Button
                type="button"
                variant="inverse"
                size="icon"
                disabled={isBusy}
                onClick={() => onShiftDueDate(task, 1)}
                onPointerDown={(event) => event.stopPropagation()}
                // The name is what the beat spec and a screen reader find it by;
                // the title is what a pointer finds.
                aria-label="+1 day"
                title="+1 day"
                // Hidden until the card is hovered or something inside it is
                // focused, as the design has it - but never hidden from a
                // keyboard, and always shown on touch, where there is no hover.
                className="size-5 text-info opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
              >
                <CalendarPlus aria-hidden className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
