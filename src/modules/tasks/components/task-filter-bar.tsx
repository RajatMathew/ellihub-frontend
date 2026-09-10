import { Button } from '@/app/components/ui/button';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import type { Task } from '@/modules/tasks/schemas/task.schema';

export type TaskAssigneeFilter = string | null;

/**
 * The board's people filter: Everyone, then one pill per person who actually
 * holds a task. Derived from the tasks on screen rather than from the employee
 * directory, so it never offers a filter that would empty the board.
 */
export function TaskFilterBar({
  tasks,
  value,
  onChange,
}: {
  tasks: Task[];
  value: TaskAssigneeFilter;
  onChange: (next: TaskAssigneeFilter) => void;
}) {
  const people = new Map<string, string>();
  for (const task of tasks) {
    if (task.assigneeId && task.assignee?.name) people.set(task.assigneeId, task.assignee.name);
  }

  if (people.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by assignee">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Filter
      </span>

      <Button
        type="button"
        size="sm"
        variant={value === null ? 'primary' : 'outline'}
        aria-pressed={value === null}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => onChange(null)}
      >
        Everyone
      </Button>

      {[...people].map(([id, name]) => {
        const active = value === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={active ? 'primary' : 'outline'}
            aria-pressed={active}
            className="h-7 rounded-full px-2 pe-3 text-xs"
            onClick={() => onChange(active ? null : id)}
          >
            <TaskAssigneeAvatar name={name} size="sm" />
            <span className="truncate">{name.split(' ')[0]}</span>
          </Button>
        );
      })}
    </div>
  );
}
