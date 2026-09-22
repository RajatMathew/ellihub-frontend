import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
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

      {/* One track, not four loose buttons.

          Drawn as separate pills it was a bordered outline, a filled navy one
          and an avatar taller than the pill holding it — three shapes for what
          is one choice between four. It is the same segmented control the app
          already uses for Mail / Tasks / Calendar: everything sits in a single
          muted track and the chosen one lifts out of it. */}
      <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-input bg-muted p-1.5 scrollbar-none">
        <FilterPill active={value === null} onClick={() => onChange(null)}>
          Everyone
        </FilterPill>

        {people.map(({ id, name }) => {
          const active = value === id;
          return (
            <FilterPill
              key={id}
              active={active}
              className="ps-1"
              onClick={() => onChange(active ? null : id)}
            >
              <TaskAssigneeAvatar name={name} size="sm" className="size-5.5" />
              <span className="truncate">{name.split(' ')[0]}</span>
            </FilterPill>
          );
        })}
      </div>
    </div>
  );
}

/** One segment of the filter track. */
function FilterPill({
  active,
  className,
  onClick,
  children,
}: {
  active: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        'motion-safe:transition-colors motion-safe:duration-100',
        active
          ? 'bg-background text-foreground shadow-xs'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}
