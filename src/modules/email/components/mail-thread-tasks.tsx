import { cn } from '@/app/lib/utils';
import { mailThreadTaskDueLabel } from '@/modules/email/lib/mail-thread-task-due';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { CircleCheck, CircleDashed } from 'lucide-react';

/**
 * The tasks raised from the open thread.
 *
 * The panel used to say only "Tasks raised here appear on the board" — the
 * server could not be asked for a thread's tasks, so a task created from here
 * vanished the moment its toast faded (elli-ui#983). One line each: what it
 * says, who holds it, when it is due.
 *
 * Deliberately read-only. The board is where a task is worked; this is the
 * thread admitting what it started, and a row of controls here would be a
 * second, lesser task UI to keep in step with the first.
 */
export function MailThreadTasks({
  tasks,
  now = new Date(),
}: {
  tasks: readonly Task[];
  now?: Date;
}) {
  if (tasks.length === 0) {
    return <p className="pb-1 text-[12.5px] text-mail-muted">No tasks raised from this thread.</p>;
  }

  return (
    <ul className="min-w-0 pb-1">
      {tasks.map((task) => {
        const isDone = task.status === 'COMPLETED';
        const Icon = isDone ? CircleCheck : CircleDashed;

        return (
          <li key={task.id} className="flex min-w-0 items-start gap-2 py-1">
            <Icon
              aria-hidden="true"
              className={cn('mt-[3px] size-3.5 shrink-0', isDone ? 'text-mail-mid' : 'text-link')}
              strokeWidth={2}
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[12.5px] leading-snug',
                  isDone ? 'text-mail-mid line-through' : 'text-mail-ink'
                )}
                title={task.title}
              >
                {task.title}
              </span>
              <MetaLine task={task} now={now} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MetaLine({ task, now }: { task: Task; now: Date }) {
  // Only what is actually set, joined by a dot — an empty "· ·" under a task
  // with neither an assignee nor a due date reads as something failing to load.
  const parts = [task.assignee?.name, mailThreadTaskDueLabel(task.dueAt, now)].filter(Boolean);

  if (parts.length === 0) return null;
  return <span className="block truncate text-[11.5px] text-mail-muted">{parts.join(' · ')}</span>;
}
