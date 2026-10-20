import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Form, FormItem, FormLabel } from '@/app/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Separator } from '@/app/components/ui/separator';
import { TaskEmailReferences } from '@/modules/tasks/components/task-email-references';
import { TaskFormFields } from '@/modules/tasks/components/task-form/task-form-fields';
import {
  emptyTaskFormValues,
  toTaskPayload,
} from '@/modules/tasks/components/task-form/task-form-values';
import { useCreateTaskMutation } from '@/modules/tasks/hooks/tasks.hooks';
import {
  taskFormSchema,
  type TaskEmailReference,
  type TaskFormData,
} from '@/modules/tasks/schemas/task.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ListTodo } from 'lucide-react';
import { useForm } from 'react-hook-form';

export type AddTaskEmailContext = {
  accountId: string;
  providerId: string;
  conversationKey?: string | null;
  threadId?: string | null;
  subject?: string | null;
  fromEmail?: string | null;
};

/**
 * Raising a task from an open email.
 *
 * A popover rather than a dialog on purpose: a task raised from a message is
 * still about that message, so the mail stays visible behind it instead of
 * being blacked out by an overlay.
 *
 * It asks for everything the board's dialog asks for, and asks with the same
 * component — `TaskFormFields`, at its compact density. Two field sets for one
 * kind of record is how the two drift apart. The linked emails are the one
 * field only this side has, so it goes in through the `afterTitle` slot.
 */
export function AddTaskPopover({ email }: { email: AddTaskEmailContext }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Add task for this email">
          <ListTodo aria-hidden="true" className="size-3.5" />
          {/* Labelled at every width. Icon-only on a phone put it next to three
              other icon buttons with nothing to tell them apart, and it read as
              missing rather than terse. */}
          <span>Add task</span>
        </Button>
      </PopoverTrigger>
      {/* Wide enough for the two segmented controls to sit side by side.
          The height cap is Radix's own measurement of the room left beside the
          trigger, not a slice of the viewport: the popover opens partway down
          the message, so a `vh` fraction measured from the top of the screen ran
          the submit button off the bottom of it. */}
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="max-h-[min(var(--radix-popover-content-available-height),44rem)] w-[calc(100vw-2rem)] overflow-y-auto p-5 sm:w-[28rem]"
      >
        {/* Keyed by open so each visit starts clean without a reset effect. */}
        {open ? <AddTaskForm key="open" email={email} onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function AddTaskForm({ email, onDone }: { email: AddTaskEmailContext; onDone: () => void }) {
  const createTask = useCreateTaskMutation();

  // The subject is the obvious first draft of what needs doing, so it seeds the
  // title rather than leaving the field blank.
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyTaskFormValues(email.subject?.trim() ?? ''),
  });

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

  // Closed on the click, not on the response. The task is written into the
  // panel's list in the same frame, so there is nothing left for the form to
  // show — it used to sit on "Adding…" through the round trip and then a
  // refetch, over a task the panel behind it could already draw
  // (elli-ui#1125). A failure rolls the row back and says so in a toast.
  const handleSubmit = (values: TaskFormData) => {
    createTask.mutate({
      ...toTaskPayload(values),
      emailReferences: references,
    });

    onDone();
  };

  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">New task</h2>
          <p className="text-xs text-muted-foreground">Raised from this message.</p>
        </div>

        <Separator className="mt-4" />

        <div className="pt-5">
          <TaskFormFields
            form={form}
            density="compact"
            afterTitle={
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm">Linked emails</FormLabel>
                <TaskEmailReferences
                  accountId={email.accountId}
                  value={references}
                  onChange={setReferences}
                  requireAtLeastOne
                />
              </FormItem>
            }
          />
        </div>

        <Separator className="mt-5" />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={createTask.isPending}>
            {createTask.isPending ? 'Adding...' : 'Add task'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
