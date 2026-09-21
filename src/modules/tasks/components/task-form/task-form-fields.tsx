import { useState, type ReactNode } from 'react';

import { DatePickerButton, TimePickerButton } from '@/app/components/date-time-picker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { FieldDescription, FieldLegend, FieldSet } from '@/app/components/ui/field';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import {
  disclosureTriggerClassName,
  dueFieldClassName,
  fieldLabelClassName,
  fieldStackClassName,
  taskTitleFieldClassName,
  type TaskFormDensity,
} from '@/modules/tasks/components/task-form/task-form-layout';
import { TaskToggleField } from '@/modules/tasks/components/task-form/task-toggle-field';
import {
  TASK_COURT_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/modules/tasks/constants/tasks.constants';
import { useTaskAssigneeOptions } from '@/modules/tasks/hooks/use-task-assignee-options';
import type { TaskFormData } from '@/modules/tasks/schemas/task.schema';
import { ChevronRight } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

/**
 * Everything a task is, as fields.
 *
 * Both places that make a task ask for the same six things: the dialog on the
 * board and the popover beside an open email. They differ in how much room they
 * have, not in what they collect, so this is one component with a `density`
 * rather than two field sets that would drift the first time one of them gained
 * a field.
 *
 * It renders fields only — no `<Form>`, no `<form>`, no buttons. The host owns
 * the surrounding chrome, because a dialog's header and a popover's are not the
 * same thing and should not be pretended into one.
 */
export function TaskFormFields({
  form,
  density = 'comfortable',
  initialAssignee = null,
  descriptionDefaultOpen = false,
  afterTitle,
}: {
  form: UseFormReturn<TaskFormData>;
  density?: TaskFormDensity;
  /** The assignee a task already has, so editing opens showing their name. */
  initialAssignee?: InfiniteSearchSelectOption | null;
  /** Open on a task that already has description text, so editing never hides it. */
  descriptionDefaultOpen?: boolean;
  /**
   * A field only one host has, placed where that host wants it rather than
   * appended after everything. The popover's linked emails belong directly under
   * the title — they are why you are in the popover — and the dialog has none.
   */
  afterTitle?: ReactNode;
}) {
  const [descriptionOpen, setDescriptionOpen] = useState(descriptionDefaultOpen);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<InfiniteSearchSelectOption | null>(
    initialAssignee
  );

  const assigneePicker = useTaskAssigneeOptions({
    search: assigneeSearch,
    selectedOptions: selectedAssignee ? [selectedAssignee] : undefined,
  });

  // The list only ever holds people who can take a task - the server filters
  // to employees with a login - so nothing here needs greying out.
  const assigneeOptions = assigneePicker.options;

  const labelClassName = fieldLabelClassName(density);
  const controlSize = density === 'comfortable' ? 'lg' : 'md';

  return (
    <div className={fieldStackClassName(density)}>
      {/* The title leads: it is the one thing a task cannot be without, so it
          gets the size and no label of its own. */}
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
                className={taskTitleFieldClassName(density)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {afterTitle}

      {/* Most tasks are a line of follow-up, so the detail box stays out of the
          way until it is wanted. */}
      <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
        <CollapsibleTrigger className={disclosureTriggerClassName(density)}>
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
                  <Textarea
                    {...field}
                    rows={density === 'comfortable' ? 3 : 2}
                    placeholder="Any detail worth keeping."
                  />
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
              <FormLabel className={labelClassName}>Priority</FormLabel>
              <TaskToggleField
                label="Priority"
                density={density}
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
              <FormLabel className={labelClassName}>Ball in court</FormLabel>
              <TaskToggleField
                label="Ball in court"
                density={density}
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
        <FieldLegend variant="label" className={labelClassName}>
          Due
        </FieldLegend>
        <div className="flex flex-wrap items-start gap-2">
          {/* The app's own pickers, not the browser's (elli-ui#974). A native
              date input is drawn by the OS: a different widget per platform, a
              field order nobody here chose, and a calendar that looks nothing
              like the one every other date in the app opens. These are the two
              the calendar's event dialog already uses. */}
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="sr-only">Due date</FormLabel>
                <FormControl>
                  <DatePickerButton
                    value={field.value}
                    onChange={field.onChange}
                    size={controlSize}
                    aria-label="Due date"
                    className={dueFieldClassName}
                  />
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
                  <TimePickerButton
                    value={field.value}
                    onChange={field.onChange}
                    size={controlSize}
                    aria-label="Due time"
                    className={dueFieldClassName}
                  />
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
            <FormLabel className={labelClassName}>Assignee</FormLabel>
            <FormControl>
              <InfiniteSearchSelect
                options={assigneeOptions}
                size={controlSize}
                leadingSlot={<TaskAssigneeAvatar name={selectedAssignee?.label} />}
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
    </div>
  );
}
