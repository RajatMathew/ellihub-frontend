import { Button } from '@/app/components/ui/button';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import type { TaskBoard } from '@/modules/tasks/schemas/task.schema';

export type TaskAssigneeFilter = string | null;

/**
 * The board's people filter: Everyone, then one pill per person who actually
 * holds a task. The list comes with the board, worked out server-side from
 * every task rather than the ones on screen - so it never offers a filter
 * that would empty the board, and choosing a person does not make the other
 * pills disappear now that the filter itself is applied by the server.
 */
export function TaskFilterBar({
  people,
  value,
  onChange,
}: {
  people: TaskBoard['people'];
  value: TaskAssigneeFilter;
  onChange: (next: TaskAssigneeFilter) => void;
}) {
  if (people.length === 0) return null;

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

      {people.map(({ id, name }) => {
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
