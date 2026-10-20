import { useState } from 'react';

import { FieldPopover } from '@/app/components/record-modal';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import { TaskAssigneePicker } from '@/modules/tasks/components/task-assignee-picker';
import type { Task } from '@/modules/tasks/schemas/task.schema';

// The design's halo: a 2px gap in the card's own colour, then a 1px line
// (elli-ui#1479).
const AVATAR_HALO =
  'shadow-[0_0_0_2px_var(--color-task-card),0_0_0_3px_var(--color-task-card-line)]';

/**
 * The card's assignee chip: the avatar, which reassigns in place so the board
 * can be re-owned without opening the task. It opens the same picker as the
 * task modal's Assignee field (elli-ui#1449) — search, people, "No assignee" —
 * rather than a plain menu of names.
 */
export function TaskAssigneeMenu({
  task,
  disabled = false,
  readOnly = false,
  onReassign,
}: {
  task: Task;
  disabled?: boolean;
  /** Draw the person without the picker — a completed card's owner is settled. */
  readOnly?: boolean;
  onReassign: (assigneeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = task.assignee?.name ?? null;

  if (readOnly) {
    // Nobody to show, and the empty slot's person-plus would invite an
    // assignment the card no longer takes.
    if (!name) return null;
    return (
      <span role="img" aria-label={`Assigned to ${name}`} title={name} className="inline-flex">
        <TaskAssigneeAvatar name={name} size="lg" className={AVATAR_HALO} />
      </span>
    );
  }

  return (
    <FieldPopover
      open={open}
      onOpenChange={setOpen}
      align="end"
      label="Choose assignee"
      trigger={
        <button
          type="button"
          disabled={disabled}
          // The whole card is a drag handle, so dnd-kit's sensor claims
          // pointerdown before Radix sees it and the click falls through to the
          // card. Keeping the event to ourselves lets the picker open, at the
          // cost of not being able to start a drag from the chip itself.
          onPointerDown={(event) => event.stopPropagation()}
          // The pseudo-element grows the circle's touch area to a 44px square
          // without moving a pixel of the layout.
          className="group/assignee relative inline-flex cursor-pointer rounded-full before:absolute before:-inset-2.5 before:content-[''] disabled:cursor-default"
          aria-label={name ? `Assigned to ${name}. Change assignee` : 'Unassigned. Choose assignee'}
        >
          <TaskAssigneeAvatar
            name={name}
            size="lg"
            // Named group: an unnamed one would also match the card's own hover
            // state, lighting the ring whenever the card was hovered (elli-ui#1140).
            className={cn(
              AVATAR_HALO,
              'transition-shadow group-hover/assignee:shadow-[0_0_0_2px_var(--color-task-card),0_0_0_3px_var(--color-task-ring)] group-focus-visible/assignee:shadow-[0_0_0_2px_var(--color-task-card),0_0_0_3px_var(--color-ring)]'
            )}
          />
        </button>
      }
    >
      {open ? (
        <TaskAssigneePicker
          selectedId={task.assigneeId}
          onChoose={(next) => {
            setOpen(false);
            if ((next?.id ?? null) !== (task.assigneeId ?? null)) onReassign(next?.id ?? null);
          }}
        />
      ) : null}
    </FieldPopover>
  );
}
