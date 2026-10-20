import { cn } from '@/app/lib/utils';
import type { EmailActivity } from '@/modules/email/api';
import {
  isMailThreadTaskOverdue,
  mailThreadTaskDueLabel,
} from '@/modules/email/lib/mail-thread-task-due';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import { Circle, CircleCheck, Clock } from 'lucide-react';

type ActivityTask = NonNullable<EmailActivity['task']>;

/**
 * The task an "added task" row raised, as it is now, on one tinted line: done
 * or not, the title, then the priority, due date and assignee — a strip rather
 * than the bordered card an event gets, so the two do not read alike. A task ticked off since reads struck through; a deleted one
 * stays, faded, so the thread's history still shows what was there.
 */
export function EmailThreadActivityTask({
  task,
  now = new Date(),
}: {
  task: ActivityTask;
  now?: Date;
}) {
  const isDone = task.status === 'COMPLETED';
  const quiet = isDone || task.deleted;
  const dueLabel = mailThreadTaskDueLabel(task.dueAt, now);
  const isOverdue = !quiet && isMailThreadTaskOverdue(task.dueAt, now);
  return (
    <div
      className={cn(
        'mt-1.5 flex w-fit min-w-0 max-w-full items-center gap-2 rounded-md bg-mail-chip px-2 py-1 text-[11px] leading-4 text-mail-muted',
        task.deleted && 'opacity-70'
      )}
    >
      {isDone ? (
        <CircleCheck aria-hidden="true" className="size-3.5 shrink-0 text-success" />
      ) : (
        <Circle aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      <span
        className={cn(
          'min-w-0 truncate text-[12.5px] font-medium',
          quiet ? 'text-mail-mid line-through' : 'text-mail-ink'
        )}
        title={task.title}
      >
        {isDone && <span className="sr-only">Done: </span>}
        {task.title}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <TaskPriorityMeter priority={task.priority} />
        {dueLabel && (
          <span className={cn('inline-flex items-center gap-1', isOverdue && 'text-destructive')}>
            <Clock aria-hidden="true" className="size-3 shrink-0" />
            {dueLabel}
          </span>
        )}
        {task.assignee && <span>{task.assignee}</span>}
        {task.deleted ? <span>Deleted</span> : isDone ? <span>Done</span> : null}
      </span>
    </div>
  );
}
