import { useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { TaskBoard } from '@/modules/tasks/components/task-board';
import { TaskFilterBar, type TaskAssigneeFilter } from '@/modules/tasks/components/task-filter-bar';
import { TaskFormDialog } from '@/modules/tasks/components/task-form-dialog';
import { TASKS_DEFAULT_PAGE_SIZE } from '@/modules/tasks/constants/tasks.constants';
import {
  useCreateTaskMutation,
  useSetTaskCompletedMutation,
  useShiftTaskDueDateMutation,
  useTasksQuery,
  useUpdateTaskMutation,
} from '@/modules/tasks/hooks/tasks.hooks';
import { useJustLandedTask } from '@/modules/tasks/hooks/use-just-landed-task';
import type { CreateTaskInput, Task } from '@/modules/tasks/schemas/task.schema';
import { Plus } from 'lucide-react';

/**
 * The Tasks board.
 *
 * Lives in two places: the Tasks tab of a mailbox, which is its home in the
 * design, and the standalone /app/tasks route. `inWorkspace` only changes the
 * chrome — inside the mailbox the surrounding page already scrolls and owns the
 * background, so the view fills its parent instead of setting its own page padding.
 */
export function TasksWorkspaceView({ inWorkspace = false }: { inWorkspace?: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<TaskAssigneeFilter>(null);

  const tasksQuery = useTasksQuery({ page: 1, size: TASKS_DEFAULT_PAGE_SIZE });
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const setCompleted = useSetTaskCompletedMutation();
  const shiftDueDate = useShiftTaskDueDateMutation();
  const { justLandedId, markLanded } = useJustLandedTask();

  const busyTaskId =
    setCompleted.isPending || shiftDueDate.isPending || updateTask.isPending
      ? (((setCompleted.variables?.id ?? shiftDueDate.variables?.id ?? updateTask.variables?.id) as
          | string
          | undefined) ?? null)
      : null;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: CreateTaskInput) => {
    if (editing) {
      await updateTask.mutateAsync({ ...payload, id: editing.id });
    } else {
      await createTask.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  // Both of these have to be memoised: `?? []` and `.filter()` each return a
  // fresh array every render, and the board keys its local arrangement off this
  // reference.
  const allTasks = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);
  // The pills filter the board in place. Filtering here rather than refetching
  // keeps the pill list stable — it is derived from every task, not the visible
  // ones, so choosing a person cannot make the other pills disappear.
  const tasks = useMemo(
    () =>
      assigneeFilter ? allTasks.filter((task) => task.assigneeId === assigneeFilter) : allTasks,
    [allTasks, assigneeFilter]
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        // The columns scroll, not the page, so the board needs a height to fill.
        // Inside the mailbox the parent already supplies one; the standalone
        // route has to take it from the viewport.
        inWorkspace
          ? 'min-h-0 flex-1 overflow-hidden bg-muted p-4 lg:p-6'
          : 'h-[calc(100dvh_-_5rem)] p-4 lg:p-6'
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Worst first — every count below is computed live from the board.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!tasksQuery.isLoading && !tasksQuery.isError ? (
            <span className="text-sm text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          ) : null}
          <Button type="button" variant="primary" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            New task
          </Button>
        </div>
      </header>

      {!tasksQuery.isLoading && !tasksQuery.isError ? (
        <TaskFilterBar tasks={allTasks} value={assigneeFilter} onChange={setAssigneeFilter} />
      ) : null}

      {tasksQuery.isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5"
          role="status"
          aria-label="Loading tasks"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <QueryErrorState title="Failed to load tasks" onRetry={() => void tasksQuery.refetch()} />
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background py-16 text-center">
          <p className="text-sm font-medium text-foreground">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one, or turn an email into a task from the mail view.
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            New task
          </Button>
        </div>
      ) : (
        <TaskBoard
          tasks={tasks}
          busyTaskId={busyTaskId}
          justLandedTaskId={justLandedId}
          onOpenTask={openEdit}
          onCompleteTask={(task) =>
            setCompleted.mutate({ id: task.id, completed: task.status !== 'COMPLETED' })
          }
          onShiftDueDate={(task, days) => {
            markLanded(task.id);
            shiftDueDate.mutate({ id: task.id, days });
          }}
          onReschedule={(task, dueAt) =>
            updateTask.mutate({ id: task.id, dueAt: dueAt.toISOString(), dueHasTime: false })
          }
          onReassign={(task, assigneeId) => updateTask.mutate({ id: task.id, assigneeId })}
          // Priority and court are ordinary fields, so changing them from the
          // card is the same PUT the dialog sends - no new endpoint, and the
          // board regroups on its own because neither decides a column.
          onPriorityChange={(task, priority) => updateTask.mutate({ id: task.id, priority })}
          onCourtChange={(task, court) => updateTask.mutate({ id: task.id, court })}
        />
      )}

      <TaskFormDialog
        open={dialogOpen}
        task={editing}
        isSaving={createTask.isPending || updateTask.isPending}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
