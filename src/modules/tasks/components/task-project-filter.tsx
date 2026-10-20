import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import type { TaskBoard } from '@/modules/tasks/schemas/task.schema';
import { Check, ChevronDown, FolderKanban } from 'lucide-react';

/**
 * The board's project filter: a dropdown of every project a task's emails
 * belong to, several of which can be ticked at once.
 *
 * A task has no project of its own - it takes the projects of the emails it
 * was raised from, so a task tied to an email in project A and another in
 * project B shows under either, or both. Empty means no filter. The list comes
 * with the board, from every task rather than the visible ones, so choosing a
 * project never makes the others disappear, and it never offers a project
 * that would empty the board.
 *
 * The list stays open across a tick so choosing three projects costs three
 * clicks, the way the people picker does it.
 *
 * It is always there, even with nothing to offer (elli-ui#1381): it used to
 * hide itself then, and on a board whose tasks were not yet linked to a
 * project the filter simply did not exist. Now it opens to say why the list is
 * empty and how to fill it.
 */
export function TaskProjectFilter({
  projects,
  value,
  onChange,
  emptyMessage = 'No task is linked to a project yet. Link one under Linked items.',
  quiet = false,
}: {
  projects: TaskBoard['projects'];
  value: string[];
  onChange: (next: string[]) => void;
  /** What the list says when nothing on screen belongs to a project. */
  emptyMessage?: string;
  /**
   * A borderless trigger for a crowded toolbar (the calendar's): it reads as
   * a control only on hover, or once a project is chosen.
   */
  quiet?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const chosen = sorted.filter((project) => value.includes(project.id));
  const label =
    chosen.length === 0
      ? 'All projects'
      : chosen.length === 1
        ? chosen[0].name
        : `${chosen.length} projects`;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={quiet ? 'ghost' : 'outline'}
          size={quiet ? 'sm' : 'lg'}
          aria-label={`Filter by project: ${label}`}
          className={cn(
            'max-w-64 shrink-0 justify-between gap-2',
            quiet && 'h-9 gap-1.5 px-2.5 font-normal text-foreground/80 hover:text-foreground',
            quiet && chosen.length > 0 && 'bg-accent text-foreground'
          )}
        >
          {quiet ? <FolderKanban aria-hidden className="size-4 text-muted-foreground" /> : null}
          <span className="truncate">{label}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className="w-80 max-w-[calc(100vw-2rem)] rounded-xl p-1.5"
      >
        <Command>
          <CommandInput placeholder="Search projects" />
          <CommandList className="max-h-64">
            <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {projects.length === 0 ? emptyMessage : 'No project by that name.'}
            </CommandEmpty>
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
                  <span className="truncate">{name}</span>
                </CommandItem>
              );
            })}
          </CommandList>
          <div className="flex items-center justify-between border-t border-border px-2 pt-2 pb-1 text-sm">
            <span className="text-muted-foreground">
              {value.length > 0 ? `${value.length} selected` : 'Showing all projects'}
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
