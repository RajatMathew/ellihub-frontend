import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useEmployeePickerOptions } from '@/modules/hr/hooks/use-employee-picker-options';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
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
          <TaskAssigneeAvatar name={name} />
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
              <TaskAssigneeAvatar name={option.label} size="sm" />
              <span className="truncate">{option.label}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
