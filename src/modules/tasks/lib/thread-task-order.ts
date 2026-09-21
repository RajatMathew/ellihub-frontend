import type { Task, TaskPriority } from '@/modules/tasks/schemas/task.schema';

/** P1 is the most urgent, so it sorts first. */
const PRIORITY_RANK: Record<TaskPriority, number> = { P1: 0, P2: 1, P3: 2 };

function dueRank(task: Task): number {
  if (!task.dueAt) return Number.MAX_SAFE_INTEGER;
  const due = new Date(task.dueAt).getTime();
  // An unparseable date sorts with the undated rather than to the very top,
  // which is where NaN lands in a numeric comparison.
  return Number.isNaN(due) ? Number.MAX_SAFE_INTEGER : due;
}

/**
 * The thread's tasks, worst first.
 *
 * Three keys, in order:
 *
 * 1. **Open before done.** A completed task is a record, not work — it belongs
 *    under the things still outstanding however urgent it once was.
 * 2. **Priority.** What the panel is asked to sort on (elli-ui#1057).
 * 3. **Due date, soonest first.** Priority alone leaves every P2 in whatever
 *    order the server returned, which for a thread with several is arbitrary
 *    and changes between refetches.
 *
 * `createdAt` breaks the last tie so the order is total: two tasks of the same
 * priority due at the same moment would otherwise swap places on re-sort.
 */
export function orderThreadTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftDone = left.status === 'COMPLETED' ? 1 : 0;
    const rightDone = right.status === 'COMPLETED' ? 1 : 0;
    if (leftDone !== rightDone) return leftDone - rightDone;

    const byPriority = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
    if (byPriority !== 0) return byPriority;

    const byDue = dueRank(left) - dueRank(right);
    if (byDue !== 0) return byDue;

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

/** How many of a thread's tasks the details panel shows before folding. */
export const THREAD_TASK_VISIBLE_LIMIT = 5;

/**
 * What the panel shows, and whether it has to offer the rest.
 *
 * The panel is sticky, so whatever it holds is on screen the whole time the
 * reader is scrolling a thread. A long task list there is not extra
 * information, it is a second scroll region competing with the messages —
 * fourteen tasks made the panel taller than the pane and the mail behind it
 * hard to reach (elli-ui#1078).
 *
 * Capping rather than dropping the sticky: the panel's value is that the
 * assignee and the court stay put, and those sit above the tasks. Five is what
 * fits without the panel outgrowing the thread; the rest are one click away
 * and the count says how many are hiding.
 */
export function splitThreadTasks<T>(
  tasks: readonly T[],
  expanded: boolean,
  limit: number = THREAD_TASK_VISIBLE_LIMIT
): { visible: T[]; hiddenCount: number } {
  // A limit of one more than the list would show a "show 0 more" control.
  if (expanded || tasks.length <= limit) {
    return { visible: [...tasks], hiddenCount: 0 };
  }

  return { visible: tasks.slice(0, limit), hiddenCount: tasks.length - limit };
}
