import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import {
  DEFAULT_DUE_TIME,
  toTaskPayload,
} from '@/modules/tasks/components/task-form/task-form-values';
import { useCreateTaskMutation } from '@/modules/tasks/hooks/tasks.hooks';
import type { TaskEmailReference, TaskPriority } from '@/modules/tasks/schemas/task.schema';

export type MailTaskEmailContext = {
  accountId: string;
  providerId: string;
  conversationKey?: string | null;
  threadId?: string | null;
  subject?: string | null;
  fromEmail?: string | null;
};

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3'];

/** Filled bars for the level, hollow for the rest — the board's own meter. */
const PRIORITY_BARS: Record<TaskPriority, number> = { P1: 1, P2: 2, P3: 3 };
const PRIORITY_TEXT: Record<TaskPriority, string> = {
  P1: 'text-priority-high',
  P2: 'text-priority-medium',
  P3: 'text-mail-mid',
};

/**
 * Raising a task from the open conversation.
 *
 * Deliberately not the board's task dialog. That form asks for a title, a
 * description, a court, an assignee and a due date and time across 28rem —
 * everything a task can carry. Raising one while reading a mail is a smaller
 * thought than that: what needs doing, how urgent, and by when. Anything else
 * is edited on the board, where there is room for it (elli-ui#921).
 *
 * The message it was raised from is attached automatically and is not shown:
 * being in this popover is what says which mail it is about.
 */
export function MailAddTaskPopover({ email }: { email: MailTaskEmailContext }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer text-[13px] font-medium text-link hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          + Add task
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-80 rounded-xl border-mail-pane-line p-3.5"
      >
        {/* Keyed by open so each visit starts clean without a reset effect. */}
        {open ? <AddTaskForm key="open" email={email} onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function AddTaskForm({ email, onDone }: { email: MailTaskEmailContext; onDone: () => void }) {
  const createTask = useCreateTaskMutation();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P2');
  const [dueDate, setDueDate] = useState('');

  const canAdd = text.trim().length > 0 && !createTask.isPending;

  const reference: TaskEmailReference = {
    accountId: email.accountId,
    providerId: email.providerId,
    conversationKey: email.conversationKey ?? null,
    threadId: email.threadId ?? null,
    subject: email.subject ?? null,
    fromEmail: email.fromEmail ?? null,
  };

  const submit = async () => {
    if (!canAdd) return;
    await createTask.mutateAsync({
      ...toTaskPayload({
        title: text.trim(),
        description: '',
        priority,
        court: 'OURS',
        dueDate,
        // Only meaningful alongside a date; `toTaskPayload` drops it otherwise.
        dueTime: dueDate ? DEFAULT_DUE_TIME : '',
        assigneeId: '',
      }),
      emailReferences: [reference],
    });
    onDone();
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        void submit();
      }}
    >
      <label className="sr-only" htmlFor="mail-add-task-text">
        Task
      </label>
      <textarea
        id="mail-add-task-text"
        value={text}
        placeholder="Describe the task…"
        autoFocus
        rows={3}
        className="w-full resize-none rounded-[9px] border border-mail-accent-edge bg-mail-card px-3 py-2.5 text-[13px] text-mail-ink outline-hidden placeholder:text-mail-muted focus:border-mail-accent"
        onChange={(event) => setText(event.target.value)}
      />

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-[12.5px] text-mail-mid">Priority</legend>
        <div className="flex gap-1.5">
          {PRIORITIES.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={priority === level}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
                PRIORITY_TEXT[level],
                priority === level
                  ? 'border-mail-accent-edge bg-mail-accent-soft'
                  : 'border-mail-pane-line bg-mail-card hover:border-mail-row-edge'
              )}
              onClick={() => setPriority(level)}
            >
              <PriorityBars level={level} />
              {level}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="min-w-0">
        <label className="mb-1.5 block text-[12.5px] text-mail-mid" htmlFor="mail-add-task-due">
          Due date
        </label>
        <input
          id="mail-add-task-due"
          type="date"
          value={dueDate}
          className="w-full rounded-[9px] border border-mail-line bg-mail-paper px-2.5 py-2 text-[12.5px] text-mail-ink outline-hidden focus:border-mail-accent-edge focus:bg-mail-card"
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="me-auto text-[11px] text-mail-muted">⌘/Ctrl + Enter to add</span>
        <button
          type="submit"
          disabled={!canAdd}
          className="cursor-pointer rounded-lg bg-mail-accent px-3.5 py-2 text-[12.5px] font-semibold text-mail-accent-foreground hover:bg-mail-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-45"
        >
          {createTask.isPending ? 'Adding…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}

function PriorityBars({ level }: { level: TaskPriority }) {
  const filled = PRIORITY_BARS[level];
  return (
    <span aria-hidden="true" className="flex items-end gap-px">
      {[4, 6.5, 9].map((height, index) => (
        <span
          key={height}
          className={cn(
            'block w-[2.5px] rounded-[1px]',
            index < filled ? 'bg-current' : 'bg-mail-pane-line'
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}
