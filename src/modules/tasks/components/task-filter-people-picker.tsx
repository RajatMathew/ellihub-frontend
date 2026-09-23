import { useState } from 'react';

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import type { TaskBoard } from '@/modules/tasks/schemas/task.schema';
import { Check } from 'lucide-react';

/**
 * The `+N more` pill and the list behind it.
 *
 * The track only has room for a handful of people; everyone else is one
 * search away here. The list is alphabetical rather than in the board's
 * order, because a person is found by name, not by how many tasks they hold.
 *
 * Each row is a checkbox: the board shows the tasks of everyone ticked. The
 * list stays open across a tick so choosing three people costs three clicks,
 * not six.
 */
export function TaskFilterPeoplePicker({
  people,
  hiddenCount,
  value,
  hiddenSelectedCount,
  onChange,
  className,
}: {
  people: TaskBoard['people'];
  /** How many people are not drawn as pills in the track. */
  hiddenCount: number;
  value: string[];
  /** Chosen people not among the track's pills, for whom this is the only sign. */
  hiddenSelectedCount: number;
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  const highlighted = hiddenSelectedCount > 0;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            highlighted
              ? `${hiddenSelectedCount} selected, ${hiddenCount} more people`
              : `${hiddenCount} more people`
          }
          className={cn(
            'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            'motion-safe:transition-colors motion-safe:duration-100',
            highlighted
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-alpha',
            open && !highlighted && 'bg-primary-alpha',
            className
          )}
        >
          +{hiddenCount} more
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-1.5"
      >
        <Command>
          <CommandInput placeholder="Search people" />
          <CommandList className="max-h-64">
            <CommandEmpty>Nobody by that name.</CommandEmpty>
            {sorted.map(({ id, name }) => {
              const active = value.includes(id);
              return (
                <CommandItem
                  key={id}
                  value={name}
                  aria-checked={active}
                  onSelect={() => toggle(id)}
                  className="cursor-pointer gap-2.5 rounded-md py-2"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-4.5 shrink-0 items-center justify-center rounded-md border',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background'
                    )}
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  <TaskAssigneeAvatar name={name} size="sm" />
                  <span className="truncate">{name}</span>
                </CommandItem>
              );
            })}
          </CommandList>
          <div className="flex items-center justify-between border-t border-border px-2 pt-2 pb-1 text-sm">
            <span className="text-muted-foreground">
              {value.length > 0 ? `${value.length} selected` : 'Showing everyone'}
            </span>
            <button
              type="button"
              disabled={value.length === 0}
              onClick={() => onChange([])}
              className="cursor-pointer font-semibold text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:text-muted-foreground/60"
            >
              Clear
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
