import { useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { TaskBoard } from '@/modules/tasks/components/task-board';
import { TaskFilterBar, type TaskAssigneeFilter } from '@/modules/tasks/components/task-filter-bar';
import { TaskFormDialog } from '@/modules/tasks/components/task-form-dialog';
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
  useSetTaskCompletedMutation,
  useShiftTaskDueDateMutation,
  useTaskBoardQuery,
  useUpdateTaskMutation,
} from '@/modules/tasks/hooks/tasks.hooks';
import { useBoardClock } from '@/modules/tasks/hooks/use-board-clock';
import { useJustLandedTask } from '@/modules/tasks/hooks/use-just-landed-task';
import { TASK_COLUMNS } from '@/modules/tasks/lib/task-board';
import { changedTaskFields } from '@/modules/tasks/lib/task-edit';
import type { CreateTaskInput, Task, TaskColumnId } from '@/modules/tasks/schemas/task.schema';
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

  // The board comes grouped and ordered from the server, cut on this
  // browser's day. The clock is part of the request, so a board left open
  // overnight fetches afresh once the date turns rather than showing
  // yesterday's columns.
  const clock = useBoardClock();
  const boardQuery = useTaskBoardQuery({
    tz: clock.tz,
    today: clock.today,
    ...(assigneeFilter && { assigneeId: assigneeFilter }),
  });
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const setCompleted = useSetTaskCompletedMutation();
  const shiftDueDate = useShiftTaskDueDateMutation();
  const reorderTask = useReorderTaskMutation();
  const deleteTask = useDeleteTaskMutation();
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

  // Deleting closes the dialog it was raised from. The card leaves the board on
  // the click, and a dialog still sitting over it would cover the Undo toast —
  // the one thing that makes the delete reversible.
  const handleDelete = (task: Task) => {
    setDialogOpen(false);
    deleteTask.mutate({ id: task.id, title: task.title });
  };

  const handleSubmit = async (payload: CreateTaskInput) => {
    if (editing) {
      // Only what changed. The update is partial — an absent field is left
      // alone — and the dialog rebuilds the due date on every save, so sending
      // the whole form told the server the date had moved when nobody had
      // touched it, and a title-only edit cost the card its hand-placed spot.
      await updateTask.mutateAsync({ ...changedTaskFields(editing, payload), id: editing.id });
    } else {
      await createTask.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const board = boardQuery.data;

  // Memoised because the board keys its local arrangement off this reference.
  const columns = useMemo(
    () =>
      Object.fromEntries(TASK_COLUMNS.map((id) => [id, board?.columns[id].tasks ?? []])) as Record<
        TaskColumnId,
        Task[]
      >,
    [board]
  );

  // Every column reports what it holds and what there is; the two differ only
  // when a column was cut at the server's cap.
  const shown = TASK_COLUMNS.reduce((sum, id) => sum + columns[id].length, 0);
  const total = TASK_COLUMNS.reduce((sum, id) => sum + (board?.columns[id].total ?? 0), 0);
  const people = board?.people ?? [];

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
          {board ? (
            <span className="text-sm text-muted-foreground">
              {/* A board cut at the server's cap says so, rather than passing
                  a subset off as everything. */}
              {shown < total
                ? `showing ${shown} of ${total} tasks`
                : `${total} ${total === 1 ? 'task' : 'tasks'}`}
            </span>
          ) : null}
          <Button type="button" variant="primary" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            New task
          </Button>
        </div>
      </header>

      {board ? (
        <TaskFilterBar people={people} value={assigneeFilter} onChange={setAssigneeFilter} />
      ) : null}

      {/* isPending, not isLoading: isLoading is isPending && isFetching, so a
          query that has no data and is not fetching - paused offline, say -
          matched neither the skeleton nor the error branch and fell through
          to "No tasks yet" with nothing loaded. No data is no data. */}
      {boardQuery.isPending ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5"
          role="status"
          aria-label="Loading tasks"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : boardQuery.isError ? (
        <QueryErrorState title="Failed to load tasks" onRetry={() => void boardQuery.refetch()} />
      ) : total === 0 ? (
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
          columns={columns}
          now={clock.now}
          busyTaskId={busyTaskId}
          justLandedTaskId={justLandedId}
          onOpenTask={openEdit}
          onCompleteTask={(task) => {
            // The same landing ring +1 day gets: the card has moved columns, so
            // say where it went rather than leaving it to be found.
            markLanded(task.id);
            setCompleted.mutate({ id: task.id, completed: task.status !== 'COMPLETED' });
          }}
          onShiftDueDate={(task, days) => {
            markLanded(task.id);
            shiftDueDate.mutate({ id: task.id, days });
          }}
          // Dragging a card to a spot. The placement is already clamped to the
          // card's priority block by the board, and the server refuses it again
          // - see PATCH /task/reorder. A card leaving Completed gets the same
          // landing ring a reopened one does: it has moved columns.
          onReorder={(task, placement) => {
            if (placement.reopen) markLanded(task.id);
            reorderTask.mutate({ id: task.id, ...placement });
          }}
          onReassign={(task, assigneeId) => updateTask.mutate({ id: task.id, assigneeId })}
          // Priority and court are ordinary fields, so changing them from the
          // card is the same PUT the dialog sends - no new endpoint. Neither
          // decides a column, though a priority change does drop the card's
          // hand-placed position, so it re-enters its new block by age.
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
        onDelete={handleDelete}
      />
    </div>
  );
}
