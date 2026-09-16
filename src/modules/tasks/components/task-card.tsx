import { useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeMenu } from '@/modules/tasks/components/task-assignee-menu';
import { TaskCardEmailSources } from '@/modules/tasks/components/task-card-email-sources';
import { TaskCompletionRing } from '@/modules/tasks/components/task-completion-ring';
import { TaskCourtToggle } from '@/modules/tasks/components/task-court-toggle';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import {
  TASK_COMPLETION_BEAT_MS,
  TASK_ENTITY_LABELS,
} from '@/modules/tasks/constants/tasks.constants';
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
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * Fill the circle, hold it, and only then save.
   *
   * The card leaves for Completed as soon as the save lands, so without the
   * pause the click and the disappearance are the same event and nothing ever
   * says "done". Holding first spends a fifth of a second saying it.
   *
   * Reopening gets no beat - the card is already where it is going.
   */
  const handleComplete = () => {
    if (isDone) {
      onComplete(task);
      return;
    }

    setIsCompleting(true);
    window.setTimeout(() => {
      // Released as the save starts rather than held until it returns: if it
      // fails the card stays put, and a circle still claiming success would be
      // the one thing worse than no beat at all.
      setIsCompleting(false);
      onComplete(task);
    }, TASK_COMPLETION_BEAT_MS);
  };

  return (
    // `group` is what lets +1 day appear on hover: it is in the tree the whole
    // time, so the layout never shifts, and it is revealed on focus too — a
    // control only a mouse can reach is a control a keyboard cannot.
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        isDone && 'opacity-60',
        // Reduced motion gets the same ring, held plainly for as long as the
        // flag is set, rather than a fade. Deciding here rather than in CSS
        // because Tailwind emits the theme's keyframes after any media block
        // that would try to override them.
        justLanded && (prefersReducedMotion() ? 'ring-2 ring-success' : 'animate-task-landed')
      )}
    >
      {/* Completion and ownership face each other across the top: the circle is
          the one control that moves the card out of the board entirely. */}
      <div className="flex items-start justify-between gap-2">
        {/* A real checkbox rather than a button carrying a label: completion is
            a two-state fact about the task, so Radix's role and aria-checked say
            so and space toggles it. Only the shape is ours - the design draws a
            dashed ring where the primitive draws a square. */}
        <span className="relative inline-flex shrink-0">
          <Checkbox
            checked={isDone || isCompleting}
            disabled={isBusy}
            onCheckedChange={handleComplete}
            // See TaskPriorityMeter: the whole card is a drag handle.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
            data-completing={isCompleting || undefined}
            className={cn(
              'size-6 shrink-0 rounded-full border-2 [&_svg]:size-3.5',
              isDone &&
                'border-success data-[state=checked]:border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground',
              // The beat, as the ticket draws it: the ring stays dashed and goes
              // green over a pale fill, so it reads as "being ticked" rather than
              // as the settled done state, which is a solid fill and a tick.
              // While open the border is transparent: TaskCompletionRing below
              // draws the dashes in its place.
              isCompleting &&
                'border-transparent text-transparent data-[state=checked]:border-transparent data-[state=checked]:bg-success-soft data-[state=checked]:text-transparent' +
                  (prefersReducedMotion() ? '' : ' animate-task-completing'),
              !isDone && !isCompleting && 'border-transparent'
            )}
          />

          {/* Seven dashes, not CSS's dozen. A sibling rather than a child so the
              checkbox's own svg sizing cannot shrink it; it follows the peer for
              hover and focus the way the ghost tick below does, and scales with
              the beat by wearing the same animation. */}
          {!isDone ? (
            <TaskCompletionRing
              className={cn(
                'transition-colors',
                isCompleting
                  ? 'text-success' + (prefersReducedMotion() ? '' : ' animate-task-completing')
                  : 'text-muted-foreground/40 peer-hover:text-success peer-focus-visible:text-success'
              )}
            />
          ) : null}

          {/* A ghost of the tick, shown while the circle is pointed at or
              tabbed to. An empty dashed ring does not say what it does; the mark
              it would leave does. Radix mounts the real indicator only once
              checked, so this is a sibling rather than a state of it - the
              variant already sets `peer`, which is what it listens to.

              Hidden from the accessibility tree: the checkbox itself already
              announces what pressing it does. */}
          {!isDone && !isCompleting ? (
            <Check
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto size-3.5 text-success opacity-0 transition-opacity peer-hover:opacity-50 peer-focus-visible:opacity-50"
            />
          ) : null}
        </span>

        {/* Provenance and ownership share the corner, as the design draws it:
            the envelope opens the emails the task was raised from, the chip
            says whose it is. */}
        <div className="flex items-center gap-1">
          <TaskCardEmailSources references={task.emailReferences} />
          <TaskAssigneeMenu task={task} disabled={isBusy} onReassign={onReassign} />
        </div>
      </div>

      <TaskPriorityMeter
        priority={task.priority}
        disabled={isBusy}
        onChange={onPriorityChange ? (next) => onPriorityChange(next) : undefined}
      />

      {/* Raw rather than `Button`: the title wraps to three lines at this column
          width, and Button is a fixed-height, nowrap, centred control - undoing
          all of that leaves nothing of the primitive behind. */}
      <button
        type="button"
        onClick={() => onOpen(task)}
        onPointerDown={(event) => event.stopPropagation()}
        className="text-start font-serif text-base font-bold leading-snug text-foreground hover:underline"
      >
        <span className={cn(isDone && 'line-through')}>{task.title}</span>
      </button>

      {task.description ? (
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
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

      <TaskCourtToggle
        court={task.court}
        disabled={isBusy}
        onChange={onCourtChange ? (next) => onCourtChange(next) : undefined}
      />

      {due ? (
        // The deadline is ruled off from the card's content by a faint line —
        // half the theme's hairline, so it separates rather than divides.
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', due.tone)}>
            <Clock className="size-3.5" aria-hidden />
            {due.text}
          </span>

          {!isDone ? (
            <Button
              type="button"
              variant="inverse"
              size="sm"
              disabled={isBusy}
              onClick={() => onShiftDueDate(task, 1)}
              onPointerDown={(event) => event.stopPropagation()}
              // Hidden until the card is hovered or something inside it is
              // focused, as the design has it - but never hidden from a
              // keyboard, and always shown on touch, where there is no hover.
              className="h-auto px-1 py-0 text-sm font-semibold text-info opacity-0 transition-opacity hover:underline focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
            >
              +1 day
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
