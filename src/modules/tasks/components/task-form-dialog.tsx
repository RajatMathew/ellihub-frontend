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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import {
  useEmployeePickerOptions,
  type EmployeePickerOption,
} from '@/modules/hr/hooks/use-employee-picker-options';
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
import { useForm } from 'react-hook-form';

const emptyValues: TaskFormData = {
  title: '',
  description: '',
  priority: 'P3',
  court: 'OURS',
  dueDate: '',
  dueTime: '',
  assigneeId: '',
};

// The API stores one instant; the form holds the day and the time separately
// because that is what the two native inputs produce.
function toFormValues(task?: Task | null): TaskFormData {
  if (!task) return emptyValues;

  const due = task.dueAt ? new Date(task.dueAt) : null;
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    court: task.court,
    dueDate: due ? `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}` : '',
    dueTime: due && task.dueHasTime ? `${pad(due.getHours())}:${pad(due.getMinutes())}` : '',
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
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update this task and who is carrying it.'
            : 'Capture the follow-up, then say who owns it and when it is due.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <DialogBody className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="What needs doing?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Any detail worth keeping." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>P1 sorts to the top of the board.</FormDescription>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_COURT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Whether we owe the next move, or they do.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
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
                    <FormLabel>Due time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormDescription>Optional — leave blank for any time that day.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Assignee</FormLabel>
                  <FormControl>
                    <InfiniteSearchSelect
                      options={assigneeOptions}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
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
