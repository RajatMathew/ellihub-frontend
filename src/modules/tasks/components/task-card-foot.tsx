import { cn } from '@/app/lib/utils';
import { TaskCourtToggle } from '@/modules/tasks/components/task-court-toggle';
import { TASK_DUE_TONE_CLASSES, taskDueLabel } from '@/modules/tasks/lib/task-due-label';
import type { Task, TaskCourt } from '@/modules/tasks/schemas/task.schema';
import { Clock } from 'lucide-react';

/**
 * The foot of a task card: where the task stands. Ruled off edge to edge and
 * pinned to the card's bottom edge so every card in a row lines its foot up
 * with the next. The court on the left; on the right the deadline as a tinted
 * pill — red once overdue — and "+1 day" to push it.
 */
export function TaskCardFoot({
  task,
  now,
  isBusy,
  onShiftDueDate,
  onCourtChange,
}: {
  task: Task;
  now: Date;
  isBusy: boolean;
  onShiftDueDate: (task: Task, days: number) => void;
  onCourtChange?: (court: TaskCourt) => void;
}) {
  const isDone = task.status === 'COMPLETED';
  // A finished task is not late: its deadline stopped mattering when it was
  // done, so a completed card shows no due pill at all.
  const due = isDone ? null : taskDueLabel(task.dueAt, now);

  return (
    // The rule runs the card's full width, past its padding, as the design
    // draws it; the foot sits 16px under it.
    <div className="mt-auto flex flex-col gap-4">
      <div aria-hidden="true" className="-mx-5 h-px bg-task-card-rule" />

      <div className="flex min-h-5.5 min-w-0 items-center gap-2">
        <TaskCourtToggle
          court={task.court}
          disabled={isBusy}
          onChange={onCourtChange ? (next) => onCourtChange(next) : undefined}
        />

        <span className="flex-1" />

        {due ? (
          <span
            className={cn(
              'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[10.5px] leading-none font-semibold tabular-nums',
              TASK_DUE_TONE_CLASSES[due.tone]
            )}
          >
            <Clock className="size-[11px]" strokeWidth={2.2} aria-hidden />
            {due.text}
          </span>
        ) : null}

        {due ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onShiftDueDate(task, 1)}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Push due date by one day"
            className="inline-flex h-5 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-task-card-line bg-task-card px-[7px] text-[10.5px] leading-none font-medium text-task-ink-soft transition-colors hover:border-task-ring hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-ours disabled:cursor-default disabled:opacity-60"
          >
            +1 day
          </button>
        ) : null}
      </div>
    </div>
  );
}
