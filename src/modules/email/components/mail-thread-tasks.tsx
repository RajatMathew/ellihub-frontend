import { useRef, useState } from 'react';

import { SPRING_CHECK_STRIKE_LAG_MS, SpringCheck } from '@/app/components/ui/spring-check';
import { cn } from '@/app/lib/utils';
import {
  isMailThreadTaskOverdue,
  mailThreadTaskDueLabel,
} from '@/modules/email/lib/mail-thread-task-due';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import { isOptimisticTaskId } from '@/modules/tasks/lib/optimistic-task';
import {
  holdThreadTaskOrder,
  orderThreadTasks,
  splitThreadTasks,
} from '@/modules/tasks/lib/thread-task-order';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { ChevronDown, Clock } from 'lucide-react';

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
 *
 * The task reads before its metadata does: the title takes a line of its own
 * at full width, and the priority, the clock and the due date sit under it as
 * one quieter line. Priority used to lead the title, which put a two-character
 * code where the eye lands and pushed the words that matter to the right.
 */
export function MailThreadTasks({
  tasks,
  threadKey,
  now = new Date(),
  isUpdating = false,
  onToggleComplete,
  onEdit,
}: {
  tasks: readonly Task[];
  /**
   * The thread these belong to. The held order is per thread: the next
   * conversation starts from the ordering rule rather than inheriting
   * whatever the last one had been worked into.
   */
  threadKey?: string | null;
  now?: Date;
  isUpdating?: boolean;
  onToggleComplete?: (task: Task, completed: boolean) => void;
  onEdit?: (task: Task) => void;
}) {
  // Opens the rest in place. Deliberately not remembered: the panel is sticky
  // and the next thread starts from the same short list rather than inheriting
  // however far the last one was unfolded.
  const [expanded, setExpanded] = useState(false);
  // The order the panel is already showing, so ticking a row strikes it
  // through where it is instead of sending it to the bottom and pulling the
  // rest up under the cursor. A ref rather than state: it records what was
  // rendered, and writing it must not schedule another render.
  const held = useRef<{ threadKey: string | null; ids: string[] }>({ threadKey: null, ids: [] });
  const key = threadKey ?? null;
  if (held.current.threadKey !== key) held.current = { threadKey: key, ids: [] };

  // Worst first, and stable between refetches — see orderThreadTasks — then
  // held in place from there.
  const ordered = holdThreadTaskOrder(orderThreadTasks(tasks), held.current.ids);
  held.current.ids = ordered.map((task) => task.id);
  const { visible, hiddenCount } = splitThreadTasks(ordered, expanded);

  if (tasks.length === 0) {
    return <p className="pb-1 text-[12.5px] text-mail-muted">No tasks raised from this thread.</p>;
  }

  return (
    <ul className="min-w-0 space-y-0.5 pb-1">
      {visible.map((task) => {
        const isDone = task.status === 'COMPLETED';
        // Drawn, not saved: the row is here in the same frame as the click,
        // but until the server answers there is no id to tick off or open
        // (elli-ui#1125). It is a moment, so it says nothing about itself
        // beyond not taking the click.
        const pending = isOptimisticTaskId(task.id);
        const canEdit = Boolean(onEdit) && !pending;

        return (
          <li key={task.id} className="min-w-0">
            <div
              className={cn(
                'flex min-w-0 items-start gap-2.5 rounded-md px-1 py-1.5',
                canEdit && 'cursor-pointer hover:bg-mail-chip',
                'motion-safe:transition-colors motion-safe:duration-100'
              )}
              {...(canEdit && onEdit
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
              <SpringCheck
                checked={isDone}
                disabled={!onToggleComplete || isUpdating || pending}
                label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
                onChange={(next) => onToggleComplete?.(task, next)}
                className="mt-px"
              />

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-[13px] leading-snug',
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
                <MetaLine task={task} now={now} isDone={isDone} />
              </span>
            </div>
          </li>
        );
      })}

      {hiddenCount > 0 && (
        <li>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-xs text-link hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setExpanded(true)}
          >
            <ChevronDown aria-hidden="true" className="size-3.5" />
            Show {hiddenCount} more
          </button>
        </li>
      )}
    </ul>
  );
}

function MetaLine({ task, now, isDone }: { task: Task; now: Date; isDone: boolean }) {
  const dueLabel = mailThreadTaskDueLabel(task.dueAt, now);
  // A completed task is not late, whatever its date says — leaving it red
  // reads as something still wanting attention.
  const isOverdue = !isDone && isMailThreadTaskOverdue(task.dueAt, now);

  return (
    /* `text-xs` on the row, matching the priority label the meter draws, so
       every run on this line shares a font size and a line height. They did
       not: the label is 12px/16px and the due date was 11.5px/17.25px, and
       centring two boxes of different line heights leaves their baselines
       apart — the priority read as sitting lower than the clock beside it. */
    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
      {/* No `onChange`, so the meter draws as a label rather than a control —
          changing priority is the edit dialog's job, and a menu here would
          fight the row's own click. */}
      <TaskPriorityMeter priority={task.priority} />

      {dueLabel && (
        <span
          className={cn(
            'inline-flex min-w-0 items-center gap-1 leading-4',
            isOverdue ? 'text-destructive' : 'text-mail-muted'
          )}
        >
          <Clock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">{dueLabel}</span>
        </span>
      )}

      {task.assignee?.name && (
        <span className="min-w-0 truncate leading-4 text-mail-muted">{task.assignee.name}</span>
      )}
    </span>
  );
}
