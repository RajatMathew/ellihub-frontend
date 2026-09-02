import { useMemo, useState } from 'react';

import {
  Kanban,
  KanbanBoard,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/app/components/ui/kanban';
import { TaskBoardColumn } from '@/modules/tasks/components/task-board-column';
import { TaskCard } from '@/modules/tasks/components/task-card';
import {
  canMoveTask,
  dueDateForColumn,
  groupTasksByColumn,
  TASK_COLUMN_LABELS,
  TASK_COLUMNS,
  type TaskColumnId,
} from '@/modules/tasks/lib/task-board';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { toast } from 'sonner';

export function TaskBoard({
  tasks,
  now: nowProp,
  busyTaskId,
  onOpenTask,
  onCompleteTask,
  onShiftDueDate,
  onReschedule,
  onReassign,
}: {
  tasks: Task[];
  now?: Date;
  busyTaskId?: string | null;
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReschedule: (task: Task, dueAt: Date) => void;
  onReassign: (task: Task, assigneeId: string | null) => void;
}) {
  // `new Date()` as a default parameter is a fresh object on every render, which
  // would make every memo below recompute and the state adjustment loop forever.
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);

  const grouped = useMemo(() => groupTasksByColumn(tasks, now), [tasks, now]);
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  // The board is held locally so cards can slide apart under a dragged card.
  // Server data still wins: when the query returns, the local arrangement is
  // replaced. Adjusting during render rather than in an effect is React's own
  // pattern for state that follows a prop, and avoids a second paint.
  const [columns, setColumns] = useState(grouped);
  const [serverColumns, setServerColumns] = useState(grouped);
  if (serverColumns !== grouped) {
    setServerColumns(grouped);
    setColumns(grouped);
  }

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
      // The reflow while hovering. What lands here is provisional: the mutation
      // fired on drop comes back through the query and replaces it.
      onValueChange={setColumns}
      // Asked before each reflow, so a refused target never opens a gap.
      canMove={(from, to) => canMoveTask(from as TaskColumnId, to as TaskColumnId).allowed}
      getItemValue={(task: Task) => task.id}
      onMove={handleMove}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${byId.get(String(active.id))?.title ?? 'task'}.`,
          onDragOver: ({ over }) =>
            over
              ? `Over ${TASK_COLUMN_LABELS[over.id as TaskColumnId] ?? over.id}.`
              : 'Not over a column.',
          onDragEnd: ({ over }) =>
            over
              ? `Dropped on ${TASK_COLUMN_LABELS[over.id as TaskColumnId] ?? over.id}.`
              : 'Drop cancelled.',
          onDragCancel: () => 'Drag cancelled.',
        },
      }}
    >
      <KanbanBoard className="grid-cols-1 items-start gap-4 md:grid-cols-3 xl:grid-cols-6">
        {/* Columns are deliberately not `disabled`: useSortable's disabled turns
            off the droppable as well as the draggable, which would make an empty
            column refuse drops. Column drags are harmless here — onValueChange
            applies nothing, so reordering columns is a no-op. */}
        {TASK_COLUMNS.map((columnId) => (
          <TaskBoardColumn
            key={columnId}
            columnId={columnId}
            tasks={columns[columnId]}
            byId={byId}
            now={now}
          >
            {columns[columnId].map((task) => (
              <KanbanItem key={task.id} value={task.id}>
                {/* KanbanItem keeps the drag listeners in context rather than
                    spreading them, so a card only becomes draggable once it
                    contains a handle. The whole card is the handle; the sensor's
                    10px activation distance leaves the buttons inside clickable. */}
                <KanbanItemHandle asChild>
                  <div>
                    <TaskCard
                      task={task}
                      now={now}
                      isBusy={busyTaskId === task.id}
                      onOpen={onOpenTask}
                      onComplete={onCompleteTask}
                      onShiftDueDate={onShiftDueDate}
                      onReassign={(assigneeId) => onReassign(task, assigneeId)}
                    />
                  </div>
                </KanbanItemHandle>
              </KanbanItem>
            ))}
          </TaskBoardColumn>
        ))}
      </KanbanBoard>

      {/* Without children the overlay renders an empty box, so a dragged card
          vanished into a faded outline. Render the real card instead, so it
          follows the cursor and stays legible the whole way across. */}
      <KanbanOverlay className="rounded-lg shadow-lg shadow-black/10">
        {({ value, variant }) => {
          if (variant === 'column') return null;
          const task = byId.get(String(value));
          if (!task) return null;
          return (
            <TaskCard
              task={task}
              now={now}
              onOpen={() => undefined}
              onComplete={() => undefined}
              onShiftDueDate={() => undefined}
              onReassign={() => undefined}
            />
          );
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
