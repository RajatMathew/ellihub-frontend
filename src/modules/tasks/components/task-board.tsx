import { useMemo } from 'react';

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/app/components/ui/kanban';
import { cn } from '@/app/lib/utils';
import { TaskCard } from '@/modules/tasks/components/task-card';
import {
  canMoveTask,
  dueDateForColumn,
  groupTasksByColumn,
  TASK_COLUMN_LABELS,
  TASK_COLUMN_TONES,
  TASK_COLUMNS,
  type TaskColumnId,
} from '@/modules/tasks/lib/task-board';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { toast } from 'sonner';

export function TaskBoard({
  tasks,
  now = new Date(),
  busyTaskId,
  onOpenTask,
  onCompleteTask,
  onShiftDueDate,
  onReschedule,
}: {
  tasks: Task[];
  now?: Date;
  busyTaskId?: string | null;
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReschedule: (task: Task, dueAt: Date) => void;
}) {
  const columns = useMemo(() => groupTasksByColumn(tasks, now), [tasks, now]);
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  /**
   * Supplying onMove puts this component in charge of every drop: the Kanban
   * primitive stops reordering on its own and commits nothing. So a rejected
   * move is simply one we decline to apply, and the card springs back.
   */
  const handleMove = ({ activeContainer, overContainer, event }: KanbanMoveEvent) => {
    const from = activeContainer as TaskColumnId;
    const to = overContainer as TaskColumnId;
    if (from === to) return;

    const task = byId.get(String(event.active.id));
    if (!task) return;

    const { allowed, reason } = canMoveTask(from, to);
    if (!allowed) {
      if (reason) toast.error(reason);
      return;
    }

    if (to === 'COMPLETED') {
      onCompleteTask(task);
      return;
    }

    // Leaving Completed for a dated column means reopening it, which the
    // completion toggle already does; the new due date follows separately.
    if (from === 'COMPLETED') onCompleteTask(task);

    const dueAt = dueDateForColumn(to, now);
    if (dueAt) onReschedule(task, dueAt);
  };

  return (
    <Kanban
      value={columns}
      onValueChange={() => {
        // Server state owns the board. Every accepted drop goes out as a
        // mutation and comes back through the query, so there is no local
        // ordering to keep in step.
      }}
      getItemValue={(task: Task) => task.id}
      onMove={handleMove}
    >
      <KanbanBoard className="grid-cols-1 items-start gap-4 md:grid-cols-3 xl:grid-cols-6">
        {/* Columns are deliberately not `disabled`: useSortable's disabled turns
            off the droppable as well as the draggable, which would make an empty
            column refuse drops. Column drags are harmless here — onValueChange
            applies nothing, so reordering columns is a no-op. */}
        {TASK_COLUMNS.map((columnId) => (
          <KanbanColumn key={columnId} value={columnId} className="rounded-lg bg-muted/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span
                  className={cn('size-2 rounded-full', TASK_COLUMN_TONES[columnId])}
                  aria-hidden
                />
                {TASK_COLUMN_LABELS[columnId]}
              </span>
              <span className="text-xs text-muted-foreground">{columns[columnId].length}</span>
            </div>

            <KanbanColumnContent value={columnId} className="flex flex-col gap-2">
              {columns[columnId].length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">column clear</p>
              ) : (
                columns[columnId].map((task) => (
                  <KanbanItem key={task.id} value={task.id}>
                    {/* KanbanItem keeps the drag listeners in context rather than
                        spreading them, so a card only becomes draggable once it
                        contains a handle. The whole card is the handle; the
                        sensor's 10px activation distance leaves the buttons
                        inside it clickable. */}
                    <KanbanItemHandle asChild>
                      <div>
                        <TaskCard
                          task={task}
                          now={now}
                          isBusy={busyTaskId === task.id}
                          onOpen={onOpenTask}
                          onComplete={onCompleteTask}
                          onShiftDueDate={onShiftDueDate}
                        />
                      </div>
                    </KanbanItemHandle>
                  </KanbanItem>
                ))
              )}
            </KanbanColumnContent>
          </KanbanColumn>
        ))}
      </KanbanBoard>

      <KanbanOverlay />
    </Kanban>
  );
}
