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
  useTaskBoardQuery,
  useUpdateTaskMutation,
} from '@/modules/tasks/hooks/tasks.hooks';
import { useBoardClock } from '@/modules/tasks/hooks/use-board-clock';
import { useJustLandedTask } from '@/modules/tasks/hooks/use-just-landed-task';
import { useTaskOutbox } from '@/modules/tasks/hooks/use-task-outbox';
import { TASK_COLUMNS } from '@/modules/tasks/lib/task-board';
import { changedTaskFields } from '@/modules/tasks/lib/task-edit';
import { applyOps } from '@/modules/tasks/lib/task-ops';
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
  const [assigneeFilter, setAssigneeFilter] = useState<TaskAssigneeFilter>([]);

  // The board comes grouped and ordered from the server, cut on this
  // browser's day. The clock is part of the request, so a board left open
  // overnight fetches afresh once the date turns rather than showing
  // yesterday's columns.
  const clock = useBoardClock();
  const boardQuery = useTaskBoardQuery({
    tz: clock.tz,
    today: clock.today,
    ...(assigneeFilter.length > 0 && { assigneeIds: assigneeFilter }),
  });
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  // Every action on a card goes through here: it shows at once and is sent
  // in a batch. The dialog's create and edit stay direct - the dialog closes
  // over the wait, and there is nothing on the board to update early.
  const { pending, dispatch } = useTaskOutbox();
  const { justLandedId, markLanded } = useJustLandedTask();

  // Only the dialog's save still waits on the server; card actions are
  // recorded and drawn in the same frame, so no card is ever "busy".
  const busyTaskId = updateTask.isPending
    ? ((updateTask.variables?.id as string | undefined) ?? null)
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
    dispatch({ type: 'delete', id: task.id, title: task.title });
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

  // What the person sees: the server's board with what they have done on
  // top. The server's rows are never edited; a confirmed op is dropped once
  // its row is written in, a refused one is just dropped.
  const board = useMemo(
    () => (boardQuery.data ? applyOps(boardQuery.data, pending, clock.now) : undefined),
    [boardQuery.data, pending, clock.now]
  );

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
          ? // The mail workspace's own paper (elli-ui#1104). Tasks is a tab
            // beside Mail and Calendar, so switching to it should not change the
            // colour of the page under the tabs; `bg-muted` made it a different
            // room. The columns take the reading pane's surface, which is what
            // lifts them off it — against `bg-muted/50` on `bg-muted` they were
            // outlines around nothing.
            'min-h-0 flex-1 overflow-hidden bg-mail-paper p-4 lg:p-6'
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
        // While a new filter loads, the previous board stays up (see
        // useTaskBoardQuery) and fades a little so it reads as on its way out.
        <div
          aria-busy={boardQuery.isPlaceholderData}
          className={cn(
            'motion-safe:transition-opacity',
            boardQuery.isPlaceholderData && 'opacity-60'
          )}
        >
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
              dispatch({
                type: 'complete',
                id: task.id,
                completed: task.status !== 'COMPLETED',
                completedAt: new Date().toISOString(),
              });
            }}
            onShiftDueDate={(task, days) => {
              markLanded(task.id);
              dispatch({ type: 'shiftDueDate', id: task.id, days });
            }}
            // Dragging a card to a spot. The placement is already clamped to the
            // card's priority block by the board, and the server refuses it again
            // - see PATCH /task/reorder. A card leaving Completed is reopened
            // first: two ops, in that order, and the batch keeps the order.
            onReorder={(task, { reopen, ...placement }) => {
              if (reopen) {
                markLanded(task.id);
                dispatch({
                  type: 'complete',
                  id: task.id,
                  completed: false,
                  completedAt: new Date().toISOString(),
                });
              }
              dispatch({ type: 'reorder', id: task.id, ...placement });
            }}
            onReassign={(task, assigneeId) =>
              dispatch({
                type: 'update',
                id: task.id,
                fields: { assigneeId },
                // The id alone cannot draw a name; the board's people list can.
                assignee: assigneeId ? (people.find((p) => p.id === assigneeId) ?? null) : null,
              })
            }
            // Priority and court are ordinary fields; the op carries just the
            // one that changed. A priority change drops the card's hand-placed
            // position, so it re-enters its new block by age.
            onPriorityChange={(task, priority) =>
              dispatch({ type: 'update', id: task.id, fields: { priority } })
            }
            onCourtChange={(task, court) =>
              dispatch({ type: 'update', id: task.id, fields: { court } })
            }
          />
        </div>
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
