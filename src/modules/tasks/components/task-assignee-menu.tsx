import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { useEmployeePickerOptions } from '@/modules/hr/hooks/use-employee-picker-options';
import { assigneeTone, initialsOf } from '@/modules/tasks/lib/assignee-tone';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { ChevronDown } from 'lucide-react';

/**
 * The card's assignee chip: coloured initials plus a chevron that reassigns in
 * place, so the board can be re-owned without opening the task.
 */
export function TaskAssigneeMenu({
  task,
  disabled = false,
  onReassign,
}: {
  task: Task;
  disabled?: boolean;
  onReassign: (assigneeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Employees load only once the menu is opened — a board of 30 cards should not
  // fire 30 employee queries on render.
  const picker = useEmployeePickerOptions({ search: '', enabled: open });

  const name = task.assignee?.name ?? null;
  const tone = task.assigneeId ? assigneeTone(task.assigneeId) : 'bg-muted text-muted-foreground';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          // The whole card is a drag handle, so dnd-kit's sensor claims
          // pointerdown before Radix sees it and the click falls through to the
          // card. Keeping the event to ourselves lets the menu open, at the cost
          // of not being able to start a drag from the chip itself.
          onPointerDown={(event) => event.stopPropagation()}
          className="flex items-center gap-0.5 rounded-md p-0.5 hover:bg-surface-hover focus-visible:bg-surface-hover"
          aria-label={name ? `Assigned to ${name}. Change assignee` : 'Unassigned. Choose assignee'}
        >
          <Avatar className="size-6">
            <AvatarFallback className={cn('text-xs font-semibold', tone)}>
              {name ? initialsOf(name) : '—'}
            </AvatarFallback>
          </Avatar>
          <ChevronDown aria-hidden className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {task.assigneeId ? (
          <DropdownMenuItem onSelect={() => onReassign(null)}>Unassign</DropdownMenuItem>
        ) : null}

        {picker.isLoading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : picker.options.length === 0 ? (
          <DropdownMenuItem disabled>No employees found</DropdownMenuItem>
        ) : (
          picker.options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              // Employees without a login cannot hold a task; the API refuses them.
              disabled={option.badge === 'Unlinked'}
              onSelect={() => onReassign(option.value)}
            >
              <Avatar className="size-5">
                <AvatarFallback
                  className={cn('text-[0.625rem] font-semibold', assigneeTone(option.value))}
                >
                  {initialsOf(option.label)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{option.label}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
