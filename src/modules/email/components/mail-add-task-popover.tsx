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
      {/*
        Always below the trigger, like the linked-items picker beside it.
        With collision avoidance on, the popover flipped above the button
        whenever the panel was near the bottom of the pane and flipped back on
        scroll — so the same control opened in two different places depending
        on where the page happened to be.

        Staying below only works if it also fits below. It did not: the form is
        around 500px and the trigger sits near the foot of the details panel, so
        the sheet ran off the bottom of the screen with the footer — and the
        `Add task` button in it — past the edge, and no way to reach it but
        zooming the browser out (elli-ui#1100).

        So the height is capped to the room Radix measured. `size()` publishes
        that as `--radix-popover-content-available-height` whether or not
        collision avoidance is on (it is a separate middleware from `flip` and
        `shift`), and it already accounts for `collisionPadding`. The content is
        a flex column so the fields take the squeeze and scroll, while the
        footer stays pinned and visible at every height.
      */}
      <PopoverContent
        align="end"
        side="bottom"
        avoidCollisions={false}
        sideOffset={8}
        collisionPadding={12}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[21.5rem] flex-col overflow-hidden rounded-xl border-mail-line p-0"
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
      className="flex min-h-0 flex-1 flex-col"
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
      {/* Labelled sections, each control in its own box. The borderless
          version read as a wall of text where nothing announced what it was —
          the chips and the date sat loose in the sheet with no heading to hang
          them on. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3.5">
        <label className="sr-only" htmlFor="mail-add-task-text">
          Task
        </label>
        <textarea
          id="mail-add-task-text"
          value={text}
          placeholder="Describe the task..."
          autoFocus
          rows={3}
          className="w-full resize-none rounded-lg border border-mail-line bg-mail-card px-3 py-2.5 text-[13.5px] leading-relaxed text-mail-ink outline-hidden placeholder:text-mail-muted focus-visible:border-mail-accent focus-visible:ring-2 focus-visible:ring-mail-accent-edge"
          onChange={(event) => setText(event.target.value)}
        />

        <label className="sr-only" htmlFor="mail-add-task-description">
          Details
        </label>
        <textarea
          id="mail-add-task-description"
          value={description}
          placeholder="Add detail (optional)"
          rows={description ? 3 : 1}
          className="w-full resize-none rounded-lg border border-mail-line bg-mail-card px-3 py-2 text-[12.5px] leading-relaxed text-mail-mid outline-hidden placeholder:text-mail-muted focus-visible:border-mail-accent focus-visible:ring-2 focus-visible:ring-mail-accent-edge"
          onChange={(event) => setDescription(event.target.value)}
        />

        <FieldGroup label="Priority">
          <div className="flex min-w-0 flex-wrap gap-2">
            {PRIORITIES.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={priority === level}
                aria-label={`Priority ${level}`}
                className={cn(
                  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
                  TASK_PRIORITY_TONES[level].text,
                  priority === level
                    ? 'border-mail-accent bg-mail-chip'
                    : 'border-mail-line hover:bg-mail-chip/60'
                )}
                onClick={() => setPriority(level)}
              >
                <PriorityBars level={level} />
                {level}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Due date" htmlFor="mail-add-task-due">
          <input
            id="mail-add-task-due"
            type="date"
            value={dueDate}
            required
            aria-invalid={dueDate ? undefined : 'true'}
            className={cn(
              'w-full cursor-pointer rounded-lg border bg-mail-card px-3 py-2 text-[12.5px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              dueDate ? 'border-mail-line text-mail-ink' : 'border-destructive/40 text-destructive'
            )}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </FieldGroup>

        <FieldGroup label="Ball in court">
          <div className="flex min-w-0 flex-wrap gap-2">
            {COURTS.map((value) => {
              const tone = TASK_COURT_TONES[value];
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={court === value}
                  className={cn(
                    'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
                    tone.text,
                    court === value
                      ? 'border-mail-accent bg-mail-chip'
                      : 'border-mail-line hover:bg-mail-chip/60'
                  )}
                  onClick={() => setCourt(value)}
                >
                  <span
                    className={cn('size-2 shrink-0 rounded-full', tone.dot)}
                    aria-hidden="true"
                  />
                  {tone.label}
                </button>
              );
            })}
          </div>
        </FieldGroup>

        {/* A plain select, not the board's search picker: a company has tens of
            people, the list is already loaded, and a combobox inside a popover
            is a second layer to escape from. */}
        <FieldGroup label="Assignee" htmlFor="mail-add-task-assignee">
          <select
            id="mail-add-task-assignee"
            value={assigneeId}
            className={cn(
              'w-full cursor-pointer truncate rounded-lg border border-mail-line bg-mail-card px-3 py-2 text-[12.5px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              assigneeId ? 'text-mail-ink' : 'text-mail-mid'
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
        </FieldGroup>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-mail-hair bg-mail-paper px-3.5 py-2.5">
        <span className="me-auto text-[11.5px] text-mail-muted">&#8984;/Ctrl + Enter to add</span>
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

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* A real `<label>` where one control owns the group, a plain heading
          where the group is a set of buttons — a label pointing at nothing is
          worse than none for a screen reader. */}
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-[11.5px] font-semibold text-mail-mid">
          {label}
        </label>
      ) : (
        <span className="text-[11.5px] font-semibold text-mail-mid">{label}</span>
      )}
      {children}
    </div>
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
