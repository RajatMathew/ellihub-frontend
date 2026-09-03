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
  boardArrangementSignature,
  canMoveTask,
  columnForTask,
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
  justLandedTaskId,
  onOpenTask,
  onCompleteTask,
  onShiftDueDate,
  onReschedule,
  onReassign,
}: {
  tasks: Task[];
  now?: Date;
  busyTaskId?: string | null;
  justLandedTaskId?: string | null;
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReschedule: (task: Task, dueAt: Date) => void;
  onReassign: (task: Task, assigneeId: string | null) => void;
}) {
  // `new Date()` as a default parameter is a fresh object on every render, which
  // would make every memo below recompute and the state adjustment loop forever.
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  // The arrangement is held locally so cards can slide apart under a dragged
  // card. It stores *ids*, not tasks: a card's content is looked up from the
  // server data at render, so an edit to a title or an assignee shows up without
  // the mirror having to notice it. Only the arrangement is ever stale, and the
  // signature below covers everything the arrangement depends on.
  const groupedIds = useMemo(() => {
    const grouped = groupTasksByColumn(tasks, now);
    return Object.fromEntries(
      TASK_COLUMNS.map((id) => [id, grouped[id].map((task) => task.id)])
    ) as Record<TaskColumnId, string[]>;
  }, [tasks, now]);

  // Adjusting during render rather than in an effect is React's own pattern for
  // state that follows a prop, and avoids a second paint. Keyed on the content
  // of the server data, not its identity: a caller that hands over a freshly
  // built array each render is easy to write by accident, and comparing
  // references would then re-seed on every render and loop.
  const signature = useMemo(() => boardArrangementSignature(tasks), [tasks]);
  const [columns, setColumns] = useState(groupedIds);
  const [appliedSignature, setAppliedSignature] = useState(signature);
  if (appliedSignature !== signature) {
    setAppliedSignature(signature);
    setColumns(groupedIds);
  }

  // Ids back to the cards they name, dropping any the server has since removed.
  const cardsIn = (columnId: TaskColumnId) =>
    columns[columnId].map((id) => byId.get(id)).filter((task): task is Task => Boolean(task));

  /**
   * Supplying onMove puts this component in charge of every drop: the Kanban
   * primitive stops reordering on its own and commits nothing. So a rejected
   * move is simply one we decline to apply, and the card springs back.
   */
  const handleMove = ({ overContainer, event }: KanbanMoveEvent) => {
    const task = byId.get(String(event.active.id));
    if (!task) return;

    // Where the card came from has to be read from the server data, not from
    // the board's current arrangement: the hover reflow has already moved it
    // into the target, so asking the board would report that it started there
    // and nothing would ever be saved.
    const from = columnForTask(task, now);
    const to = overContainer as TaskColumnId;
    if (from === to) return;

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
      // Kanban renders a plain div around the board; without a height it grows to
      // the tallest column and nothing below it can ever scroll.
      className="flex min-h-0 flex-1 flex-col"
      value={columns}
      // The reflow while hovering. What lands here is provisional: the mutation
      // fired on drop comes back through the query and replaces it.
      onValueChange={setColumns}
      // Asked before each reflow, so a refused target never opens a gap.
      canMove={(from, to) => canMoveTask(from as TaskColumnId, to as TaskColumnId).allowed}
      getItemValue={(id: string) => id}
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
      {/* Five columns do not fit a phone, and stacking them loses the board. Below
          md it becomes a snap-scrolling row instead — one column at a time, the
          next peeking so it is obvious you can swipe.

          gap-3 between the panels: gap-4 read as too wide, and the design sits its
          columns 12px apart on a 236px column, which is what gap-3 is. The phone
          row keeps a wider gap, where the space is what separates one swiped
          column from the next rather than a border. */}
      <KanbanBoard className="scrollbar-on-hover flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto md:grid md:snap-none md:grid-cols-3 md:gap-3 md:overflow-x-visible xl:grid-cols-5">
        {/* Columns are deliberately not `disabled`: useSortable's disabled turns
            off the droppable as well as the draggable, which would make an empty
            column refuse drops. Column drags are harmless here — onValueChange
            applies nothing, so reordering columns is a no-op. */}
        {TASK_COLUMNS.map((columnId) => (
          <TaskBoardColumn
            key={columnId}
            columnId={columnId}
            tasks={cardsIn(columnId)}
            byId={byId}
            now={now}
          >
            {cardsIn(columnId).map((task) => (
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
                      justLanded={justLandedTaskId === task.id}
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
