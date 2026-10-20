import { useEffect, useState } from 'react';

import {
  PropRow,
  RecordModal,
  RecordModalCompose,
  RecordModalFooter,
  RecordModalProps,
  RecordModalSeparator,
} from '@/app/components/record-modal';
import { Button } from '@/app/components/ui/button';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { LinkedEmailsField } from '@/modules/email/components/record-links/linked-emails-field';
import { LinkedRecordsField } from '@/modules/email/components/record-links/linked-records-field';
import { useBringThreadRecords } from '@/modules/email/hooks/use-thread-linked-records';
import type { LinkedEmail, LinkedRecord } from '@/modules/email/lib/record-links';
import {
  toTaskFormValues,
  toTaskPayload,
} from '@/modules/tasks/components/task-form/task-form-values';
import {
  TaskAssigneeField,
  type TaskModalAssignee,
} from '@/modules/tasks/components/task-modal/task-assignee-field';
import { TaskDueField } from '@/modules/tasks/components/task-modal/task-due-field';
import { TaskPriorityField } from '@/modules/tasks/components/task-modal/task-priority-field';
import { useRecordLinkOptions } from '@/modules/tasks/hooks/use-record-link-options';
import {
  taskEmailsOf,
  taskRecordsOf,
  toTaskEmailReferences,
  toTaskEntityLinks,
} from '@/modules/tasks/lib/task-record-links';
import type {
  CreateTaskInput,
  Task,
  TaskEmailReference,
  TaskFormData,
} from '@/modules/tasks/schemas/task.schema';
import { Calendar, Link2, Mail, Signal, Trash2, User } from 'lucide-react';

/**
 * Making or editing a task (elli-ui#1379): the title and notes written on the
 * sheet, then due date, priority and assignee, then the emails and records the
 * task is about. The court a task already has is kept as it is — it is set on
 * the card, not here.
 */
export function TaskFormDialog({
  open,
  task,
  accountId: _accountId,
  emailReferences,
  assignee,
  initialValues,
  isSaving = false,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  task?: Task | null;
  /** The mailbox a new task is raised from; the email picker searches every mailbox. */
  accountId?: string;
  /** Create only — the emails a new task starts out citing, e.g. the open thread. */
  emailReferences?: TaskEmailReference[];
  /** Create only — who a new task starts out with, e.g. the thread's assignee. */
  assignee?: InfiniteSearchSelectOption | null;
  /** Create only — fields a new task starts out with, e.g. Elliot's drafted task. */
  initialValues?: Partial<TaskFormData>;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
  /** Edit only — there is nothing to delete while creating. */
  onDelete: (task: Task) => void;
}) {
  // Mounted only while open, and keyed by the task, so every open starts from
  // fresh state without a reset-in-an-effect.
  if (!open) return null;
  return (
    <TaskModalContent
      key={task?.id ?? 'new'}
      task={task ?? null}
      emailReferences={emailReferences}
      assignee={assignee}
      initialValues={initialValues}
      isSaving={isSaving}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      onDelete={onDelete}
    />
  );
}

function TaskModalContent({
  task,
  emailReferences,
  assignee,
  initialValues,
  isSaving,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  task: Task | null;
  emailReferences?: TaskEmailReference[];
  assignee?: InfiniteSearchSelectOption | null;
  initialValues?: Partial<TaskFormData>;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
  onDelete: (task: Task) => void;
}) {
  const isEdit = task !== null;
  const [values, setValues] = useState<TaskFormData>(() =>
    task ? toTaskFormValues(task) : { ...toTaskFormValues(null), ...initialValues }
  );
  const [person, setPerson] = useState<TaskModalAssignee>(() =>
    task
      ? task.assignee
        ? { id: task.assignee.id, name: task.assignee.name }
        : null
      : assignee
        ? { id: assignee.value, name: assignee.label }
        : null
  );
  const [emails, setEmails] = useState<LinkedEmail[]>(() =>
    taskEmailsOf(task?.emailReferences ?? emailReferences ?? [])
  );
  const [records, setRecords] = useState<LinkedRecord[]>(() =>
    taskRecordsOf(task?.entityLinks ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const { bring, bringing } = useBringThreadRecords(emails, setRecords);
  const linkEmails = (next: LinkedEmail[]) => {
    setEmails(next);
    void bring(next, emails);
  };
  // A task raised from a thread starts with that thread's linked items too.
  useEffect(() => {
    if (!isEdit) void bring(emails, []);
    // Once, on open: the modal remounts for each task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const patch = (next: Partial<TaskFormData>) => setValues((current) => ({ ...current, ...next }));

  const submit = () => {
    if (!values.title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (!values.dueDate) {
      setError('Choose when the task is due.');
      return;
    }
    setError(null);
    void onSubmit({
      ...toTaskPayload({ ...values, title: values.title.trim(), assigneeId: person?.id ?? '' }),
      emailReferences: toTaskEmailReferences(emails),
      entityLinks: toTaskEntityLinks(records),
    });
  };

  return (
    <RecordModal
      open
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit task' : 'New task'}
      description={isEdit ? 'Update this task.' : 'Create a task.'}
      onSubmit={submit}
      autoFocusTitle={!isEdit}
      footer={
        <RecordModalFooter
          submitLabel={isEdit ? 'Save task' : 'Create task'}
          submitting={isSaving}
          canSubmit={values.title.trim().length > 0}
          onCancel={() => onOpenChange(false)}
          error={error}
          leading={
            task ? (
              // No confirm: the delete is soft and its toast offers Undo.
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(task)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null
          }
        />
      }
    >
      <RecordModalCompose
        idPrefix="task"
        title={values.title}
        onTitleChange={(title) => patch({ title })}
        titlePlaceholder="Task title"
        notes={values.description ?? ''}
        onNotesChange={(description) => patch({ description })}
        notesPlaceholder="Add a description, notes or acceptance criteria…"
        autoFocus={!isEdit}
      />
      <RecordModalProps>
        <PropRow icon={Calendar} label="Due date">
          <TaskDueField
            day={values.dueDate}
            time={values.dueTime}
            onChange={({ day, time }) => patch({ dueDate: day, dueTime: time })}
          />
        </PropRow>
        <PropRow icon={Signal} label="Priority">
          <TaskPriorityField value={values.priority} onChange={(priority) => patch({ priority })} />
        </PropRow>
        <PropRow icon={User} label="Assignee">
          <TaskAssigneeField value={person} onChange={setPerson} />
        </PropRow>
        <RecordModalSeparator />
        <PropRow icon={Mail} label="Emails" count={emails.length}>
          <LinkedEmailsField
            value={emails}
            onChange={linkEmails}
            onNavigate={() => onOpenChange(false)}
          />
        </PropRow>
        <PropRow icon={Link2} label="Linked items" count={records.length}>
          <LinkedRecordsField
            value={records}
            onChange={setRecords}
            useOptions={useRecordLinkOptions}
            bringing={bringing}
          />
        </PropRow>
      </RecordModalProps>
    </RecordModal>
  );
}
