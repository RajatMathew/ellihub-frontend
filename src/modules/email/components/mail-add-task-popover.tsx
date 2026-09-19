import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import {
  canSaveMailTaskDraft,
  mailTaskDraftToPayload,
  taskDateInputValue,
} from '@/modules/email/lib/mail-task-draft';
import { TASK_COURT_TONES, TASK_PRIORITY_TONES } from '@/modules/tasks/constants/tasks.constants';
import { useCreateTaskMutation } from '@/modules/tasks/hooks/tasks.hooks';
import { useTaskAssigneeOptions } from '@/modules/tasks/hooks/use-task-assignee-options';
import type {
  TaskCourt,
  TaskEmailReference,
  TaskPriority,
} from '@/modules/tasks/schemas/task.schema';

export type MailTaskEmailContext = {
  accountId: string;
  providerId: string;
  conversationKey?: string | null;
  threadId?: string | null;
  subject?: string | null;
  fromEmail?: string | null;
};

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3'];
const COURTS: TaskCourt[] = ['OURS', 'THEIRS'];

/** Filled bars for the level, hollow for the rest — the board's own meter. */
const PRIORITY_BARS: Record<TaskPriority, number> = { P1: 1, P2: 2, P3: 3 };

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
        className="w-[21.5rem] overflow-hidden rounded-xl border-mail-line p-0"
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
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P2');
  const [court, setCourt] = useState<TaskCourt>('OURS');
  const [assigneeId, setAssigneeId] = useState('');
  // Only once the popover is open — this is a request, and the trigger sits on
  // every thread the reader opens.
  const { options: assigneeOptions } = useTaskAssigneeOptions();
  // A due date is not optional: the board has no "No due date" column, so the
  // API rejects a task without one. Offering an empty date field meant Add task
  // answered with "Due at: A due date is required" and left the draft sitting in
  // a popover that never closed. Today is the honest default for something
  // raised off a mail you are reading now, and it is one click to change.
  const [dueDate, setDueDate] = useState(() => taskDateInputValue(new Date()));

  const draft = { text, description, priority, court, dueDate, assigneeId };
  const canAdd = canSaveMailTaskDraft(draft) && !createTask.isPending;

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
      ...mailTaskDraftToPayload(draft),
      emailReferences: [reference],
    });
    onDone();
  };

  return (
    <form
      className="flex flex-col"
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
      {/* No box around the text: the popover itself is the field, the way a
          comment composer is. A bordered textarea, a bordered date input and
          three bordered chips made four nested rectangles inside 19rem. */}
      <label className="sr-only" htmlFor="mail-add-task-text">
        Task
      </label>
      <textarea
        id="mail-add-task-text"
        value={text}
        placeholder="What needs doing?"
        autoFocus
        rows={3}
        className="w-full resize-none border-0 bg-transparent px-4 pb-2.5 pt-4 text-[14px] leading-relaxed text-mail-ink outline-hidden placeholder:text-mail-muted"
        onChange={(event) => setText(event.target.value)}
      />

      {/* Borderless like the title above it, and one line until it is used —
          detail is worth having but must not make the popover look like a form
          before anybody has typed anything (elli-ui#989). */}
      <label className="sr-only" htmlFor="mail-add-task-description">
        Details
      </label>
      <textarea
        id="mail-add-task-description"
        value={description}
        placeholder="Add detail (optional)"
        rows={description ? 3 : 1}
        className="w-full resize-none border-0 bg-transparent px-4 pb-3 text-[12.5px] leading-relaxed text-mail-mid outline-hidden placeholder:text-mail-muted"
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 px-3.5 pb-3">
        {PRIORITIES.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={priority === level}
            aria-label={`Priority ${level}`}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
              TASK_PRIORITY_TONES[level].text,
              priority === level ? 'bg-mail-chip' : 'hover:bg-mail-chip/60'
            )}
            onClick={() => setPriority(level)}
          >
            <PriorityBars level={level} />
            {level}
          </button>
        ))}

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-mail-hair" />

        <label className="sr-only" htmlFor="mail-add-task-due">
          Due date
        </label>
        <input
          id="mail-add-task-due"
          type="date"
          value={dueDate}
          required
          aria-invalid={dueDate ? undefined : 'true'}
          className={cn(
            'cursor-pointer rounded-md px-2.5 py-1.5 text-[12.5px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            dueDate ? 'bg-mail-chip text-mail-ink' : 'text-destructive hover:bg-mail-chip/60'
          )}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 px-3.5 pb-3">
        {COURTS.map((value) => {
          const tone = TASK_COURT_TONES[value];
          return (
            <button
              key={value}
              type="button"
              aria-pressed={court === value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
                tone.text,
                court === value ? 'bg-mail-chip' : 'hover:bg-mail-chip/60'
              )}
              onClick={() => setCourt(value)}
            >
              <span className={cn('size-2 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
              {tone.label}
            </button>
          );
        })}

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-mail-hair" />

        {/* A plain select, not the board's search picker: a company has tens of
            people, the list is already loaded, and a combobox inside a popover
            is a second layer to escape from. */}
        <label className="sr-only" htmlFor="mail-add-task-assignee">
          Assignee
        </label>
        <select
          id="mail-add-task-assignee"
          value={assigneeId}
          className={cn(
            'min-w-0 max-w-[10.5rem] cursor-pointer truncate rounded-md px-2.5 py-1.5 text-[12.5px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            assigneeId ? 'bg-mail-chip text-mail-ink' : 'text-mail-mid hover:bg-mail-chip/60'
          )}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">Unassigned</option>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-mail-hair bg-mail-paper px-3.5 py-2.5">
        <span className="me-auto text-[11.5px] text-mail-muted">&#8984; + Enter</span>
        <button
          type="submit"
          disabled={!canAdd}
          className="cursor-pointer rounded-md bg-mail-accent px-3.5 py-2 text-[13px] font-semibold text-mail-accent-foreground hover:bg-mail-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
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
            index < filled ? 'bg-current' : 'bg-muted-foreground/25'
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}
