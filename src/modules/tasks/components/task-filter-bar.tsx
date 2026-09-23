import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import { TaskFilterPeoplePicker } from '@/modules/tasks/components/task-filter-people-picker';
import { useTaskFilterLayout } from '@/modules/tasks/hooks/use-task-filter-layout';
import type { TaskBoard } from '@/modules/tasks/schemas/task.schema';

/** The people whose tasks the board shows; empty means everyone's. */
export type TaskAssigneeFilter = string[];

/**
 * The board's people filter: Everyone, then one pill per person who actually
 * holds a task. The list comes with the board, worked out server-side from
 * every task rather than the ones on screen - so it never offers a filter
 * that would empty the board, and choosing a person does not make the other
 * pills disappear now that the filter itself is applied by the server.
 *
 * Several people can be ticked at once: each pill toggles, `Everyone` clears,
 * and the board shows the union.
 *
 * With forty people the pills once ran off the right edge in a scroll strip
 * nobody could tell was there. Now the track keeps to one line: as many
 * people as the width allows, then a `+N more` pill that opens the rest as a
 * searchable list. The count of people who fit is measured, not guessed from
 * a breakpoint, so a phone shows one or two and a wide screen shows eight -
 * see `useTaskFilterLayout`.
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
  const selected = people.flatMap((person, index) => (value.includes(person.id) ? [index] : []));
  const { containerRef, trackRef, measureRef, layout } = useTaskFilterLayout({
    count: people.length,
    selected,
  });

  if (people.length === 0) return null;

  const visible = layout.order.slice(0, layout.shown).map((index) => people[index]);
  const hiddenCount = people.length - visible.length;
  const hiddenSelectedCount = value.filter(
    (id) => !visible.some((person) => person.id === id)
  ).length;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id]);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Filter by assignee">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Filter
      </span>

      {/* One track, not four loose buttons.

          Drawn as separate pills it was a bordered outline, a filled navy one
          and an avatar taller than the pill holding it — three shapes for what
          is one choice between four. It is the same segmented control the app
          already uses for Mail / Tasks / Calendar: everything sits in a single
          muted track and the chosen one lifts out of it. */}
      <div ref={containerRef} className="w-full min-w-0">
        <div
          ref={trackRef}
          className="flex w-fit max-w-full items-center gap-0.5 overflow-hidden rounded-full border border-input bg-muted p-1.5"
        >
          <FilterPill active={value.length === 0} onClick={() => onChange([])}>
            Everyone
          </FilterPill>

          {visible.map(({ id, name }) => (
            <PersonPill
              key={id}
              name={name}
              active={value.includes(id)}
              onClick={() => toggle(id)}
            />
          ))}

          {hiddenCount > 0 ? (
            <TaskFilterPeoplePicker
              people={people}
              hiddenCount={hiddenCount}
              value={value}
              hiddenSelectedCount={hiddenSelectedCount}
              onChange={onChange}
            />
          ) : null}
        </div>

        {/* Every pill once more, at full width and out of sight, so the
            layout hook can measure the ones the track is not showing. The
            `+N more` pill is measured at the largest count it could carry. */}
        <div className="relative h-0 w-0 overflow-hidden" aria-hidden inert>
          <div ref={measureRef} className="absolute flex items-center gap-0.5 whitespace-nowrap">
            <FilterPill active onClick={noop}>
              Everyone
            </FilterPill>
            {people.map(({ id, name }) => (
              <PersonPill key={id} name={name} active={false} onClick={noop} />
            ))}
            <span className="inline-flex h-7 shrink-0 items-center px-3 text-[13px] font-semibold">
              +{people.length} more
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function noop() {}

/** A person's segment: their avatar and first name. */
function PersonPill({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <FilterPill active={active} className="ps-1" onClick={onClick}>
      <TaskAssigneeAvatar name={name} size="sm" className="size-5.5" />
      <span className="truncate">{name.split(' ')[0]}</span>
    </FilterPill>
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
        'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap',
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
