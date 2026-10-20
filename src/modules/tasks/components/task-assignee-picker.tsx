import { useState } from 'react';

import { PickerEmpty, PickerOption, PickerSearch } from '@/app/components/record-modal';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import { useTaskAssigneeOptions } from '@/modules/tasks/hooks/use-task-assignee-options';
import { Check } from 'lucide-react';

export type TaskAssigneeChoice = { id: string; name: string } | null;

/** The dashed ring that stands for "nobody". */
export function EmptyAssigneeAvatar() {
  return (
    <span
      aria-hidden="true"
      className="size-5.5 shrink-0 rounded-full border-[1.5px] border-dashed border-muted-foreground/40"
    />
  );
}

/**
 * Who carries a task, picked from the people who can: a search, the list with
 * the current one ticked, and "No assignee" at the foot. One picker for the task
 * modal's Assignee field and the card's avatar (elli-ui#1449), so reassigning
 * looks and works the same from either.
 *
 * Mounted only while its popover is open, so the people load on open and the
 * search starts empty every time.
 */
export function TaskAssigneePicker({
  selectedId,
  onChoose,
}: {
  selectedId: string | null | undefined;
  onChoose: (next: TaskAssigneeChoice) => void;
}) {
  const [search, setSearch] = useState('');
  const { options, isLoading } = useTaskAssigneeOptions({ search, enabled: true });
  return (
    <>
      <PickerSearch
        value={search}
        onChange={setSearch}
        placeholder="Assign to…"
        label="Search people"
      />
      <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="People">
        {options.map((option) => (
          <PickerOption
            key={option.value}
            role="option"
            aria-selected={option.value === selectedId}
            onClick={() => onChoose({ id: option.value, name: option.label })}
          >
            <TaskAssigneeAvatar name={option.label} size="sm" />
            <span className="min-w-0 flex-1 truncate">
              {option.label}
              {option.badge ? (
                <span className="text-xs text-muted-foreground"> · {option.badge}</span>
              ) : null}
            </span>
            {option.value === selectedId ? <Check className="size-4" aria-hidden="true" /> : null}
          </PickerOption>
        ))}
        {!isLoading && options.length === 0 ? (
          <PickerEmpty>
            {search ? `No one matches “${search}”` : 'No one to assign yet'}
          </PickerEmpty>
        ) : null}
      </div>
      <div className="-mx-1.5 my-1.5 h-px bg-border/50" />
      <PickerOption onClick={() => onChoose(null)}>
        <EmptyAssigneeAvatar />
        <span className="flex-1 text-muted-foreground">No assignee</span>
      </PickerOption>
    </>
  );
}
