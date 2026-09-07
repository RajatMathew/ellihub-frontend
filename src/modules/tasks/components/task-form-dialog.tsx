import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Form, FormItem, FormLabel } from '@/app/components/ui/form';
import { Separator } from '@/app/components/ui/separator';
import { TaskEmailReferences } from '@/modules/tasks/components/task-email-references';
import { TaskFormFields } from '@/modules/tasks/components/task-form/task-form-fields';
import {
  toTaskFormValues,
  toTaskPayload,
} from '@/modules/tasks/components/task-form/task-form-values';
import {
  taskFormSchema,
  type CreateTaskInput,
  type Task,
  type TaskEmailReference,
  type TaskFormData,
} from '@/modules/tasks/schemas/task.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function TaskFormDialog({
  open,
  task,
  isSaving = false,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  task?: Task | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
  /** Edit only — there is nothing to delete while creating. */
  onDelete: (task: Task) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-3xl">
        {/* Mounted only while open, and keyed by the task, so every open starts
            from fresh state. That is what keeps this form free of the usual
            reset-in-an-effect dance. */}
        {open && (
          <TaskFormDialogContent
            key={task?.id ?? 'new'}
            task={task}
            isSaving={isSaving}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskFormDialogContent({
  task,
  isSaving,
  onCancel,
  onSubmit,
  onDelete,
}: {
  task?: Task | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
  onDelete: (task: Task) => void;
}) {
  const isEdit = Boolean(task);

  // Not part of the form's values: the picker owns its own shape, and the two
  // are only joined when the task is saved.
  const [references, setReferences] = useState<TaskEmailReference[]>(
    () => task?.emailReferences ?? []
  );

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toTaskFormValues(task),
  });

  const handleSubmit = async (values: TaskFormData) => {
    await onSubmit({ ...toTaskPayload(values), emailReferences: references });
  };

  return (
    <>
      <DialogHeader className="mb-0 space-y-2">
        <DialogTitle className="text-3xl">{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogDescription className="text-base">
          {isEdit
            ? 'Update this task and who is carrying it.'
            : 'Capture the follow-up, then say who owns it and when it is due.'}
        </DialogDescription>
      </DialogHeader>

      <Separator className="mt-6" />

      <Form {...form}>
        <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <DialogBody className="pt-7">
            <TaskFormFields
              form={form}
              // A task made on the board can cite the mail it is about, the same
              // as one raised from a message (#861). No mailbox is handed down
              // here — there is no open message to take one from — so the picker
              // resolves it, and nothing is required: a board task need cite no
              // email at all.
              afterTitle={
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-base">Linked emails</FormLabel>
                  <TaskEmailReferences value={references} onChange={setReferences} />
                </FormItem>
              }
              initialAssignee={
                task?.assignee ? { value: task.assignee.id, label: task.assignee.name } : null
              }
              descriptionDefaultOpen={Boolean(task?.description)}
            />
          </DialogBody>

          <Separator className="mt-7" />

          {/* `DialogFooter` stacks `flex-col-reverse` below `sm`, and its only gap is
              `sm:space-x-2.5` — horizontal, so stacked buttons would touch. It also
              centres on the cross axis, which in a column means three
              content-width buttons at three different widths. Both overrides are
              therefore mobile-only: a real gap, and `items-center` deferred to `sm`
              so the column falls back to `stretch` and the buttons share one width. */}
          <DialogFooter className="gap-2 sm:items-center sm:gap-0">
            {/* The only way to delete a task, by product decision — the board's
                cards deliberately carry no delete, so removing one is always a
                deliberate trip through the task you are removing.

                Left of the divide, away from Cancel and Save, because it is not
                one of the things you might do on your way out of a form. Edit
                only: there is nothing to delete before the task exists.

                No confirm dialog. The delete is soft and the toast it raises
                offers Undo, which is the cheaper of the two ways to ask; a
                dialog on top of that would be a second question about the same
                click. Closing this one is the caller's job, in the same handler
                that deletes — left open, it would cover that toast. */}
            {task ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => onDelete(task)}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto sm:w-auto"
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="text-foreground"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
              {isEdit ? 'Save task' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
