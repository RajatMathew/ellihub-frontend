import { SPRING_CHECK_STRIKE_LAG_MS, SpringCheck } from '@/app/components/ui/spring-check';
import { cn } from '@/app/lib/utils';
import { mailThreadTaskDueLabel } from '@/modules/email/lib/mail-thread-task-due';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import { orderThreadTasks } from '@/modules/tasks/lib/thread-task-order';
import type { Task } from '@/modules/tasks/schemas/task.schema';

/**
 * The tasks raised from the open thread.
 *
 * The panel used to say only "Tasks raised here appear on the board" — the
 * server could not be asked for a thread's tasks, so a task created from here
 * vanished the moment its toast faded (elli-ui#983).
 *
 * It is no longer read-only (elli-ui#1057). Ticking one off and opening it to
 * edit are the two things you want from the thread that raised it, and making
 * the reader go and find it on the board to do either is the long way round.
 * Everything else still belongs to the board — this shows what it says, how
 * urgent it is, who holds it and when it is due, and nothing more.
 */
export function MailThreadTasks({
  tasks,
  now = new Date(),
  isUpdating = false,
  onToggleComplete,
  onEdit,
}: {
  tasks: readonly Task[];
  now?: Date;
  isUpdating?: boolean;
  onToggleComplete?: (task: Task, completed: boolean) => void;
  onEdit?: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="pb-1 text-[12.5px] text-mail-muted">No tasks raised from this thread.</p>;
  }

  // Worst first, and stable between refetches — see orderThreadTasks.
  const ordered = orderThreadTasks(tasks);

  return (
    <ul className="min-w-0 pb-1">
      {ordered.map((task) => {
        const isDone = task.status === 'COMPLETED';

        return (
          <li key={task.id} className="min-w-0">
            <div
              className={cn(
                'group/task flex min-w-0 items-start gap-2 rounded-md px-1 py-1.5',
                onEdit && 'cursor-pointer hover:bg-mail-chip',
                'motion-safe:transition-colors motion-safe:duration-100'
              )}
              {...(onEdit
                ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => onEdit(task),
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      onEdit(task);
                    },
                  }
                : {})}
            >
              <span className="mt-px">
                <SpringCheck
                  checked={isDone}
                  disabled={!onToggleComplete || isUpdating}
                  label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  onChange={(next) => onToggleComplete?.(task, next)}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* No `onChange`, so the meter draws as a label rather than
                      a control — changing priority is the edit dialog's job,
                      and a menu here would fight the row's own click. */}
                  <TaskPriorityMeter priority={task.priority} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[12.5px] leading-snug',
                      // The rule chases the tick rather than landing with it,
                      // which is the whole of the Spring Check micro-interaction.
                      'motion-safe:transition-[opacity,color] motion-safe:duration-200',
                      isDone ? 'text-mail-mid line-through' : 'text-mail-ink'
                    )}
                    style={
                      isDone
                        ? { transitionDelay: `${SPRING_CHECK_STRIKE_LAG_MS}ms`, opacity: 0.62 }
                        : undefined
                    }
                    title={task.title}
                  >
                    {task.title}
                  </span>
                </span>
                <MetaLine task={task} now={now} />
              </span>
            </div>
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
  return (
    <span className="block truncate ps-[22px] text-[11.5px] text-mail-muted">
      {parts.join(' · ')}
    </span>
  );
}
