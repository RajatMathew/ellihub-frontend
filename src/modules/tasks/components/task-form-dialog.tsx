import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { FieldDescription, FieldLegend, FieldSet } from '@/app/components/ui/field';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import {
  useEmployeePickerOptions,
  type EmployeePickerOption,
} from '@/modules/hr/hooks/use-employee-picker-options';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import {
  disclosureTriggerClassName,
  dueFieldClassName,
  taskTitleFieldClassName,
} from '@/modules/tasks/components/task-form/task-form-layout';
import { TaskToggleField } from '@/modules/tasks/components/task-form/task-toggle-field';
import {
  TASK_COURT_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/modules/tasks/constants/tasks.constants';
import {
  taskFormSchema,
  type CreateTaskInput,
  type Task,
  type TaskFormData,
} from '@/modules/tasks/schemas/task.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';

const pad = (value: number) => String(value).padStart(2, '0');

const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// End of business. Any default is a guess; this one is at least the same guess
// every time, which beats "whatever o'clock it happened to be".
const DEFAULT_DUE_TIME = '17:00';

// A function rather than a constant: the due date defaults to today, and a tab
// left open overnight would otherwise keep offering yesterday.
const emptyValues = (): TaskFormData => ({
  title: '',
  description: '',
  priority: 'P3',
  court: 'OURS',
  // TEMPORARILY defaulted — the date and time are both required while the
  // "No due date" column is disabled, so a new task opens on today at the close
  // of business rather than empty. Restore '' for both when it comes back.
  dueDate: dateInputValue(new Date()),
  dueTime: DEFAULT_DUE_TIME,
  assigneeId: '',
});

// The API stores one instant; the form holds the day and the time separately
// because that is what the two native inputs produce.
function toFormValues(task?: Task | null): TaskFormData {
  if (!task) return emptyValues();

  const due = task.dueAt ? new Date(task.dueAt) : null;

  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    court: task.court,
    dueDate: due ? dateInputValue(due) : '',
    dueTime:
      due && task.dueHasTime ? `${pad(due.getHours())}:${pad(due.getMinutes())}` : DEFAULT_DUE_TIME,
    assigneeId: task.assigneeId ?? '',
  };
}

function toPayload(values: TaskFormData): CreateTaskInput {
  // No date means no deadline. A date without a time means the whole day, which
  // we anchor at midnight local and flag with dueHasTime so the card knows not
  // to render a clock.
  const dueAt = values.dueDate
    ? new Date(`${values.dueDate}T${values.dueTime || '00:00'}`).toISOString()
    : null;

  return {
    title: values.title,
    description: values.description ? values.description : null,
    priority: values.priority,
    court: values.court,
    dueAt,
    dueHasTime: Boolean(values.dueDate && values.dueTime),
    assigneeId: values.assigneeId ? values.assigneeId : null,
  };
}

export function TaskFormDialog({
  open,
  task,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  task?: Task | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
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
}: {
  task?: Task | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void> | void;
}) {
  const isEdit = Boolean(task);
  // Open on a task that already has one, so editing never hides existing text.
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(task?.description));
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<EmployeePickerOption | null>(() =>
    task?.assignee ? { value: task.assignee.id, label: task.assignee.name } : null
  );

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toFormValues(task),
  });

  const assigneePicker = useEmployeePickerOptions({
    search: assigneeSearch,
    selectedOptions: selectedAssignee ? [selectedAssignee] : undefined,
  });

  // Employees without a login cannot hold a task — the API rejects them — so
  // show them greyed rather than letting someone pick one and hit an error.
  const assigneeOptions = assigneePicker.options.map((option) =>
    option.badge === 'Unlinked' ? { ...option, disabled: true } : option
  );

  const handleSubmit = async (values: TaskFormData) => {
    await onSubmit(toPayload(values));
  };

  return (
    <>
      <DialogHeader className="mb-0 space-y-1.5">
        <DialogTitle className="text-2xl">{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update this task and who is carrying it.'
            : 'Capture the follow-up, then say who owns it and when it is due.'}
        </DialogDescription>
      </DialogHeader>

      <Separator className="mt-5" />

      <Form {...form}>
        <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <DialogBody className="space-y-6 pt-6">
            {/* The title leads: it is the one thing a task cannot be without, so
                it gets the size and no label of its own. */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="sr-only">Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Add a title"
                      className={taskTitleFieldClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Most tasks are a line of follow-up, so the detail box stays out of
                the way until it is wanted. */}
            <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
              <CollapsibleTrigger className={disclosureTriggerClassName}>
                <ChevronRight
                  className="size-4 text-muted-foreground transition-transform data-[state=open]:rotate-90"
                  data-state={descriptionOpen ? 'open' : 'closed'}
                  aria-hidden="true"
                />
                Add description
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="sr-only">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Any detail worth keeping." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Priority</FormLabel>
                    <TaskToggleField
                      label="Priority"
                      value={field.value}
                      onChange={field.onChange}
                      options={TASK_PRIORITY_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.short,
                        tone: option.tone,
                      }))}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="court"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Ball in court</FormLabel>
                    <TaskToggleField
                      label="Ball in court"
                      value={field.value}
                      onChange={field.onChange}
                      options={TASK_COURT_OPTIONS}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and time are one decision, so they read as one field. */}
            <FieldSet className="gap-0">
              <FieldLegend variant="label">Due</FieldLegend>
              <div className="flex flex-wrap items-start gap-2">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="sr-only">Due date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" required className={dueFieldClassName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="sr-only">Due time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" required className={dueFieldClassName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FieldDescription className="mt-1.5">
                Both are required — the board sorts on them.
              </FieldDescription>
            </FieldSet>

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Assignee</FormLabel>
                  <FormControl>
                    <InfiniteSearchSelect
                      options={assigneeOptions}
                      leadingSlot={
                        <TaskAssigneeAvatar
                          id={selectedAssignee?.value}
                          name={selectedAssignee?.label}
                        />
                      }
                      value={field.value || null}
                      selectedOption={selectedAssignee}
                      search={assigneeSearch}
                      isLoading={assigneePicker.isLoading}
                      isFetchingNextPage={assigneePicker.isFetchingNextPage}
                      hasNextPage={assigneePicker.hasNextPage}
                      onSearchChange={setAssigneeSearch}
                      onFetchNextPage={assigneePicker.fetchNextPage}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      onOptionChange={setSelectedAssignee}
                      placeholder={assigneePicker.isLoading ? 'Loading...' : 'Unassigned'}
                      searchPlaceholder="Search employees..."
                      emptyMessage="No employees found."
                      loadingMessage="Loading..."
                    />
                  </FormControl>
                  <FormDescription>Only employees with a login can hold a task.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DialogBody>

          <Separator className="mt-6" />

          <DialogFooter className="items-center">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isEdit ? 'Save task' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
