import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { TaskEmailReferences } from '@/modules/tasks/components/task-email-references';
import { TASK_PRIORITY_OPTIONS } from '@/modules/tasks/constants/tasks.constants';
import { useCreateTaskMutation } from '@/modules/tasks/hooks/tasks.hooks';
import type { TaskEmailReference, TaskPriority } from '@/modules/tasks/schemas/task.schema';
import { ListTodo } from 'lucide-react';

export type AddTaskEmailContext = {
  accountId: string;
  providerId: string;
  conversationKey?: string | null;
  threadId?: string | null;
  subject?: string | null;
  fromEmail?: string | null;
};

/**
 * Quick capture of a task from an open email.
 *
 * A popover rather than a dialog on purpose: this is a two-field aside taken
 * without leaving the message, so it should not black out the mail behind it.
 * The full field set lives in the task dialog, reachable from the board.
 */
export function AddTaskPopover({ email }: { email: AddTaskEmailContext }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Add task for this email">
          <ListTodo aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Add task</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        {/* Keyed by open so each visit starts clean without a reset effect. */}
        {open ? <AddTaskForm key="open" email={email} onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

// TEMPORARILY REQUIRED — the "No due date" column is commented out in
// lib/task-board.ts, so a task raised from an email without a date would have
// nowhere to show. Both fields open filled in and neither can be left empty.
const todayInputValue = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// End of business, matching the create dialog's default.
const DEFAULT_DUE_TIME = '17:00';

function AddTaskForm({ email, onDone }: { email: AddTaskEmailContext; onDone: () => void }) {
  // The subject is the obvious first draft of what needs doing, so it seeds the
  // title rather than leaving the field blank.
  const [title, setTitle] = useState(email.subject?.trim() ?? '');
  const [priority, setPriority] = useState<TaskPriority>('P3');
  const [dueDate, setDueDate] = useState(todayInputValue);
  const [dueTime, setDueTime] = useState(DEFAULT_DUE_TIME);
  const [touched, setTouched] = useState(false);

  const createTask = useCreateTaskMutation();
  const trimmed = title.trim();
  const isInvalid = touched && trimmed.length === 0;
  const isDueInvalid = touched && (dueDate.length === 0 || dueTime.length === 0);

  // The open message is attached from the outset — that is the reason you are
  // in this popover — and is only the starting point: more can be added, and
  // this one swapped out, so long as one remains.
  const [references, setReferences] = useState<TaskEmailReference[]>(() => [
    {
      accountId: email.accountId,
      providerId: email.providerId,
      conversationKey: email.conversationKey ?? null,
      threadId: email.threadId ?? null,
      subject: email.subject ?? null,
      fromEmail: email.fromEmail ?? null,
    },
  ]);

  const submit = async () => {
    setTouched(true);
    if (!trimmed || !dueDate || !dueTime) return;

    await createTask.mutateAsync({
      title: trimmed,
      priority,
      court: 'OURS',
      dueAt: new Date(`${dueDate}T${dueTime}`).toISOString(),
      dueHasTime: true,
      emailReferences: references,
    });

    onDone();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="add-task-title">Task</Label>
        <Input
          id="add-task-title"
          value={title}
          autoFocus
          placeholder="What needs doing?"
          aria-invalid={isInvalid}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {isInvalid ? <p className="text-xs text-destructive">A task needs a title</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Linked emails</Label>
        <TaskEmailReferences
          accountId={email.accountId}
          value={references}
          onChange={setReferences}
          requireAtLeastOne
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="add-task-priority">Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
            <SelectTrigger id="add-task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-task-due">Due</Label>
          <Input
            id="add-task-due"
            type="date"
            required
            value={dueDate}
            aria-invalid={isDueInvalid}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-task-due-time">Time</Label>
          <Input
            id="add-task-due-time"
            type="time"
            required
            value={dueTime}
            aria-invalid={isDueInvalid}
            onChange={(event) => setDueTime(event.target.value)}
          />
        </div>
      </div>

      {isDueInvalid ? (
        <p className="text-xs text-destructive">A task needs a due date and a time</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={createTask.isPending}>
          {createTask.isPending ? 'Adding...' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}
