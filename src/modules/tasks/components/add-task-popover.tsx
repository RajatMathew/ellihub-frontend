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
      <PopoverContent align="end" className="w-80">
        {/* Keyed by open so each visit starts clean without a reset effect. */}
        {open ? <AddTaskForm key="open" email={email} onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function AddTaskForm({ email, onDone }: { email: AddTaskEmailContext; onDone: () => void }) {
  // The subject is the obvious first draft of what needs doing, so it seeds the
  // title rather than leaving the field blank.
  const [title, setTitle] = useState(email.subject?.trim() ?? '');
  const [priority, setPriority] = useState<TaskPriority>('P3');
  const [dueDate, setDueDate] = useState('');
  const [touched, setTouched] = useState(false);

  const createTask = useCreateTaskMutation();
  const trimmed = title.trim();
  const isInvalid = touched && trimmed.length === 0;

  const reference: TaskEmailReference = {
    accountId: email.accountId,
    providerId: email.providerId,
    conversationKey: email.conversationKey ?? null,
    threadId: email.threadId ?? null,
    subject: email.subject ?? null,
    fromEmail: email.fromEmail ?? null,
  };

  const submit = async () => {
    setTouched(true);
    if (!trimmed) return;

    await createTask.mutateAsync({
      title: trimmed,
      priority,
      court: 'OURS',
      // A bare date means the whole day, so dueHasTime stays false.
      dueAt: dueDate ? new Date(`${dueDate}T00:00`).toISOString() : null,
      dueHasTime: false,
      emailReferences: [reference],
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
        {isInvalid ? (
          <p className="text-xs text-destructive">A task needs a title</p>
        ) : (
          <p className="text-xs text-muted-foreground">Linked to this email.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
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
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
      </div>

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
