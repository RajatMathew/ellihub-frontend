import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import { useTaskAssigneeOptions } from '@/modules/tasks/hooks/use-task-assignee-options';
import type { Task } from '@/modules/tasks/schemas/task.schema';

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
  const picker = useTaskAssigneeOptions({ enabled: open });

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
          // The chip is the avatar alone, no chevron — the artifact's trigger
          // is a bare circle that answers on hover with a ring rather than
          // advertising itself with a second icon (elli-ui#1140). The
          // pseudo-element grows the 24px circle's touch area to a 44px square
          // without moving a pixel of the layout — raising the padding instead
          // would have pushed the whole card header taller on a phone. Nothing
          // sits within 8px of it: the completion circle is at the far end of
          // the row.
          className="group/assignee relative inline-flex cursor-pointer rounded-full before:absolute before:-inset-2.5 before:content-['']"
          aria-label={name ? `Assigned to ${name}. Change assignee` : 'Unassigned. Choose assignee'}
        >
          <TaskAssigneeAvatar
            name={name}
            // Named group: an unnamed one would have also matched the card's
            // own hover state (also `group`, for the +1 day reveal), lighting
            // the ring whenever the card was hovered anywhere rather than only
            // when this chip itself was (elli-ui#1140).
            className="transition-shadow group-hover/assignee:ring-3 group-hover/assignee:ring-info/25 group-focus-visible/assignee:ring-3 group-focus-visible/assignee:ring-info/25"
          />
        </button>
      </DropdownMenuTrigger>

      {/* Capped and scrolling, the way the mail toolbar's menus already do it:
          the employee list is as long as the company is, and uncapped it ran off
          the bottom of a phone with the last few names unreachable. The cap is
          shorter on a phone than on a desktop because the viewport is.

          Narrower too, but only from sm up. On a phone the rows stay their full
          height — this is the same thumb the trigger was just widened for, and
          shrinking a list you scroll with it would take back what that gained. */}
      <DropdownMenuContent
        align="end"
        className="max-h-56 w-52 overflow-y-auto sm:max-h-72 sm:w-56"
      >
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
              onSelect={() => onReassign(option.value)}
              className="sm:py-1 sm:text-xs"
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
