import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeMenu } from '@/modules/tasks/components/task-assignee-menu';
import { TASK_ENTITY_LABELS } from '@/modules/tasks/constants/tasks.constants';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { format, isBefore, startOfDay } from 'date-fns';
import { CalendarPlus, Check, CircleCheck, Clock } from 'lucide-react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const PRIORITY_VARIANT = {
  P1: 'destructive',
  P2: 'warning',
  P3: 'secondary',
} as const;

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
        <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">
          {task.priority}
        </Badge>
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
            <Badge key={`${link.entityType}-${link.entityId}`} variant="outline" size="sm">
              {TASK_ENTITY_LABELS[link.entityType]} · {link.entityId}
            </Badge>
          ))}
        </div>
      ) : null}

      <Badge variant={task.court === 'OURS' ? 'warning' : 'secondary'} size="sm" appearance="light">
        Ball · {task.court === 'OURS' ? 'Ours' : 'Theirs'}
      </Badge>

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
              <CalendarPlus className="size-3" aria-hidden />
              +1 day
            </Button>
          ) : null}
        </div>
      ) : null}

      {source ? (
        <p className="text-xs italic text-muted-foreground">
          from email · {source.subject || source.fromEmail || 'linked message'}
        </p>
      ) : null}

      <Button
        type="button"
        variant={isDone ? 'outline' : 'ghost'}
        size="sm"
        disabled={isBusy}
        onClick={() => onComplete(task)}
        className="h-9 w-fit px-3 text-xs sm:h-7 sm:px-2"
      >
        {isDone ? (
          <>
            <CircleCheck className="size-3" aria-hidden />
            Reopen
          </>
        ) : (
          <>
            <Check className="size-3" aria-hidden />
            Done
          </>
        )}
      </Button>
    </div>
  );
}
