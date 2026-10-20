import { useState } from 'react';

import { FieldButton, FieldPopover } from '@/app/components/record-modal';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import {
  EmptyAssigneeAvatar,
  TaskAssigneePicker,
  type TaskAssigneeChoice,
} from '@/modules/tasks/components/task-assignee-picker';

export type TaskModalAssignee = TaskAssigneeChoice;

/** "Assignee": who carries the task, picked from the people who can. */
export function TaskAssigneeField({
  value,
  onChange,
}: {
  value: TaskModalAssignee;
  onChange: (next: TaskModalAssignee) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FieldPopover
      open={open}
      onOpenChange={setOpen}
      label="Choose assignee"
      trigger={
        <FieldButton aria-haspopup="dialog">
          {value ? (
            <>
              <TaskAssigneeAvatar name={value.name} size="sm" />
              <span className="truncate">{value.name}</span>
            </>
          ) : (
            <>
              <EmptyAssigneeAvatar />
              <span className="text-muted-foreground/70">Unassigned</span>
            </>
          )}
        </FieldButton>
      }
    >
      <TaskAssigneePicker
        selectedId={value?.id}
        onChoose={(next) => {
          onChange(next);
          setOpen(false);
        }}
      />
    </FieldPopover>
  );
}
