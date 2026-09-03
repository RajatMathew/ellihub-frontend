import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeMenu } from '@/modules/tasks/components/task-assignee-menu';
import { TASK_ENTITY_LABELS } from '@/modules/tasks/constants/tasks.constants';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { format, isBefore, startOfDay } from 'date-fns';
import { CircleCheck, Clock } from 'lucide-react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** "was due Thu, Jul 2 · 5d late" / "due today · 11:42 AM" / "Wed, Jul 15" */
function dueLabel(task: Task, now: Date) {
  if (!task.dueAt) return null;

  const due = new Date(task.dueAt);
  const time = task.dueHasTime ? format(due, 'h:mm a') : null;
  const isToday = startOfDay(due).getTime() === startOfDay(now).getTime();
  const isLate = isBefore(startOfDay(due), startOfDay(now));

  if (isLate) {
    const days = Math.round((startOfDay(now).getTime() - startOfDay(due).getTime()) / 86_400_000);
    return { text: `was due ${format(due, 'EEE, MMM d')} · ${days}d late`, late: true };
  }

  const day = isToday ? 'due today' : format(due, 'EEE, MMM d');
  return { text: time ? `${day} · ${time}` : day, late: false };
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
}) {
  const due = dueLabel(task, now);
  const isDone = task.status === 'COMPLETED';
  const source = task.emailReferences[0];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3',
        isDone && 'opacity-60',
        // Reduced motion gets the same ring, held plainly for as long as the
        // flag is set, rather than a fade. Deciding here rather than in CSS
        // because Tailwind emits the theme's keyframes after any media block
        // that would try to override them.
        justLanded && (prefersReducedMotion() ? 'ring-2 ring-primary' : 'animate-task-landed')
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* The design writes the priority as a quiet label rather than a
            coloured pill — the card's colour is spent on lateness and on whose
            court the ball is in, and a third filled chip up here competed with
            both. */}
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          {task.priority}
        </span>
        <TaskAssigneeMenu task={task} disabled={isBusy} onReassign={onReassign} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="text-start text-sm font-semibold text-foreground hover:underline"
      >
        <span className={cn(isDone && 'line-through')}>{task.title}</span>
      </button>

      {task.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      ) : null}

      {task.entityLinks.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.entityLinks.map((link) => (
            <Badge
              key={`${link.entityType}-${link.entityId}`}
              variant="secondary"
              appearance="light"
              size="sm"
              // Filled and squared off rather than outlined and pill-shaped, as
              // the design draws its reference chips.
              className="rounded-sm uppercase tracking-wide"
            >
              {TASK_ENTITY_LABELS[link.entityType]} · {link.entityId}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Both courts, with the one in play filled in — the design shows the pair
          so the card says what the alternative is, not just where things stand.
          It reports state and does not change it (the court is edited in the
          task dialog), so the idle half is decorative and hidden from screen
          readers, leaving the filled half to carry the meaning on its own
          rather than the colour doing it.

          These two drop the badge's mono/uppercase/wide-tracking label styling,
          which is the one place in the card it cannot be kept: two tracked-out
          uppercase chips do not fit side by side in a column this narrow, and
          the second was being clipped by the card's edge. The design draws them
          in sentence case for the same reason. */}
      <div className="flex w-fit items-center gap-1">
        <Badge
          variant={task.court === 'OURS' ? 'primary' : 'secondary'}
          appearance={task.court === 'OURS' ? 'default' : 'light'}
          size="sm"
          className="rounded-sm font-sans normal-case tracking-normal"
          aria-hidden={task.court !== 'OURS'}
        >
          Ball · Ours
        </Badge>
        <Badge
          variant={task.court === 'THEIRS' ? 'primary' : 'secondary'}
          appearance={task.court === 'THEIRS' ? 'default' : 'light'}
          size="sm"
          className="rounded-sm font-sans normal-case tracking-normal"
          aria-hidden={task.court !== 'THEIRS'}
        >
          Ball · Theirs
        </Badge>
      </div>

      {due ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              due.late ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
          >
            <Clock className="size-3" aria-hidden />
            {due.text}
          </span>
          {!isDone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => onShiftDueDate(task, 1)}
              // Roomier on a phone, where this is a fingertip rather than a cursor.
              className="h-8 px-2.5 text-xs sm:h-6 sm:px-2"
            >
              {/* Text alone, as the design has it. The calendar icon it used to
                  carry cost the ~16px that kept this on the same line as the due
                  date, and pushed it onto a line of its own. */}
              +1 day
            </Button>
          ) : null}
        </div>
      ) : null}

      {source ? (
        // The design tints the provenance line rather than greying it, which is
        // what stops it reading as another line of description.
        <p className="text-xs italic text-destructive/75">
          from email · {source.subject || source.fromEmail || 'linked message'}
        </p>
      ) : null}

      {/* The actions are ruled off from the card's content by a deliberately
          faint line: half the theme's own hairline, inset by the card's padding
          so it starts where the button under it does rather than running edge to
          edge. It is meant to be barely there — a separation, not a division,
          and it is deliberately fainter than `border-border` would draw it. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        <Button
          type="button"
          variant={isDone ? 'outline' : 'ghost'}
          size="sm"
          disabled={isBusy}
          onClick={() => onComplete(task)}
          className={cn(
            'h-9 px-3 text-xs sm:h-7 sm:px-2',
            // Done reads as a soft filled affordance in the design, not a bare
            // ghost button.
            !isDone && 'bg-success-soft text-success-soft-foreground hover:bg-success-soft/80'
          )}
        >
          {isDone ? (
            <>
              <CircleCheck className="size-3" aria-hidden />
              Reopen
            </>
          ) : (
            <>
              <CircleCheck className="size-3" aria-hidden />
              Done
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
