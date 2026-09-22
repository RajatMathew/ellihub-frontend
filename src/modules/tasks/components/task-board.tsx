import { useCallback, useMemo, useState } from 'react';

import {
  Kanban,
  KanbanBoard,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/app/components/ui/kanban';
import { TaskBoardCard } from '@/modules/tasks/components/task-board-card';
import { TaskBoardColumn } from '@/modules/tasks/components/task-board-column';
import { TaskCard } from '@/modules/tasks/components/task-card';
import { useEqualCardHeights } from '@/modules/tasks/hooks/use-equal-card-heights';
import {
  boardArrangementSignature,
  canMoveTask,
  columnForTask,
  dropBoardOrder,
  dropMovesTask,
  dropNeighbours,
  dueDateForColumn,
  resolveDropIndex,
  TASK_COLUMN_LABELS,
  TASK_COLUMNS,
  type TaskColumnId,
} from '@/modules/tasks/lib/task-board';
import type { Task, TaskCourt, TaskPriority } from '@/modules/tasks/schemas/task.schema';
import { toast } from 'sonner';

export function TaskBoard({
  columns: served,
  now,
  busyTaskId,
  justLandedTaskId,
  onOpenTask,
  onCompleteTask,
  onShiftDueDate,
  onReorder,
  onReassign,
  onPriorityChange,
  onCourtChange,
}: {
  /** The board as the cache holds it: the server's columns, patched by every write. */
  columns: Record<TaskColumnId, Task[]>;
  now: Date;
  busyTaskId?: string | null;
  justLandedTaskId?: string | null;
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReorder: (
    task: Task,
    placement: {
      previousId: string | null;
      nextId: string | null;
      boardOrder: number | null;
      // Set only when the card changed column, so the reschedule and the
      // placement land as one write.
      dueAt?: string;
      // Set when the card left Completed: it has to be reopened before it can
      // be placed among open cards, and the two must not race.
      reopen?: boolean;
    }
  ) => void;
  onReassign: (task: Task, assigneeId: string | null) => void;
  onPriorityChange: (task: Task, priority: TaskPriority) => void;
  onCourtChange: (task: Task, court: TaskCourt) => void;
}) {
  // Every card, and which column the server (or the last write) put it in.
  // The column is read from here rather than re-derived from the due date:
  // the cache is the one place that knows where a card is, and asking it
  // keeps the board and its drag rules on the same answer.
  const { byId, homeOf, tasks } = useMemo(() => {
    const byId = new Map<string, Task>();
    const homeOf = new Map<string, TaskColumnId>();
    const tasks: Task[] = [];
    for (const columnId of TASK_COLUMNS) {
      for (const task of served[columnId]) {
        byId.set(task.id, task);
        homeOf.set(task.id, columnId);
        tasks.push(task);
      }
    }
    return { byId, homeOf, tasks };
  }, [served]);

  // The arrangement is held locally so cards can slide apart under a dragged
  // card. It stores *ids*, not tasks: a card's content is looked up from the
  // server data at render, so an edit to a title or an assignee shows up without
  // the mirror having to notice it. Only the arrangement is ever stale, and the
  // signature below covers everything the arrangement depends on.
  const groupedIds = useMemo(
    () =>
      Object.fromEntries(
        TASK_COLUMNS.map((id) => [id, served[id].map((task) => task.id)])
      ) as Record<TaskColumnId, string[]>,
    [served]
  );

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

  /**
   * Put the arrangement back the way the server has it.
   *
   * The hover reflow moves a card between columns as you pass over them, and
   * nothing undoes that on its own. A drag from Pending to Overdue crosses Due
   * Today, which is a legal target, so the card is already sitting there by the
   * time Overdue refuses the drop — and refusing only means "do not save", so
   * the card stayed in Due Today looking moved. Same for a drag released over
   * nothing, or cancelled with Escape.
   *
   * Memoised on the arrangement it restores to. It is handed to the kanban,
   * which keys its own drag handlers off it, so a fresh function every render
   * rebuilt those handlers every render for no change. (A no-op restore does
   * not re-render on its own: React bails out of a setState that hands back the
   * reference already held.)
   */
  const restoreArrangement = useCallback(() => setColumns(groupedIds), [groupedIds]);

  // Every card the height of the tallest, re-measured whenever the server's
  // board changes. Keyed on `served` rather than the local arrangement: a drag
  // moves cards about but does not change what any of them says.
  const boardRef = useEqualCardHeights<HTMLDivElement>(served);

  // Ids back to the cards they name, dropping any the server has since removed.
  const cardsIn = (columnId: TaskColumnId) =>
    columns[columnId].map((id) => byId.get(id)).filter((task): task is Task => Boolean(task));

  /**
   * Supplying onMove puts this component in charge of every drop: the Kanban
   * primitive stops reordering on its own and commits nothing. So a rejected
   * move is simply one we decline to apply, and the card springs back.
   */
  const handleMove = ({ overContainer, overIndex, event }: KanbanMoveEvent) => {
    const task = byId.get(String(event.active.id));
    if (!task) return restoreArrangement();

    // Where the card came from has to be read from the cache, not from the
    // board's current arrangement: the hover reflow has already moved it into
    // the target, so asking the board would report that it started there and
    // nothing would ever be saved.
    const from = homeOf.get(task.id) ?? columnForTask(task, now);
    const to = overContainer as TaskColumnId;

    const { allowed, reason } = canMoveTask(from, to);
    if (!allowed) {
      if (reason) toast.error(reason);
      restoreArrangement();
      return;
    }

    // Completing is a state change rather than a placement: the card lands in
    // Completed by priority and then age, so there is nothing to save about
    // where it was dropped.
    if (to === 'COMPLETED') {
      onCompleteTask(task);
      return;
    }

    // Leaving Completed for a dated column means reopening it as well. That
    // rides along with the placement rather than going out as its own request:
    // sent separately the two raced, and a placement that arrived first was
    // refused for putting a completed card among open ones.
    const reopen = from === 'COMPLETED';

    // A reorder and a move between columns are the same act — put the card where
    // it was dropped — and differ only in whether a due date rides along.
    // `overIndex` describes the column as the board is rendering it, which
    // already holds the dragged card because the hover reflow put it there, so
    // an index and an insertion point are the same number. The aim is clamped to
    // the card's own priority block, so a drop that would outrank a P1 lands at
    // the top of the P3s instead.
    const column = cardsIn(to);
    const index = resolveDropIndex(column, task.id, overIndex);
    const { previousId, nextId } = dropNeighbours(column, task.id, index);
    const boardOrder = dropBoardOrder(column, task.id, index);

    if (from === to) {
      if (!dropMovesTask(column, task.id, index)) return restoreArrangement();

      // Nothing either side means the card is alone in its priority block, and
      // there is no position to save.
      if (!previousId && !nextId) return restoreArrangement();

      onReorder(task, { previousId, nextId, boardOrder });
      return;
    }

    // The new due date goes with the placement in one write. Sent separately,
    // the card would land in its new column by age and then visibly jump to
    // where it was dropped.
    const dueAt = dueDateForColumn(to, now);
    if (!dueAt) return restoreArrangement();

    onReorder(task, { previousId, nextId, boardOrder, dueAt: dueAt.toISOString(), reopen });
  };

  return (
    // Kanban does not take a ref, so the measuring root is a wrapper of the
    // same shape around it.
    <div ref={boardRef} className="flex min-h-0 flex-1 flex-col">
      <Kanban
        // Kanban renders a plain div around the board; without a height it grows to
        // the tallest column and nothing below it can ever scroll.
        //
        // While a card is in the air the whole board shows the grabbing hand and
        // refuses text selection. The overlay lets the pointer through, so the
        // cursor was whatever sat under it — an arrow over a column, a pointing
        // hand over a button — and a mouse drag across the board left card text
        // highlighted in its wake.
        className="flex min-h-0 flex-1 flex-col data-[dragging=true]:select-none data-[dragging=true]:cursor-grabbing data-[dragging=true]:**:cursor-grabbing"
        value={columns}
        // The reflow while hovering. What lands here is provisional: the mutation
        // fired on drop comes back through the query and replaces it.
        onValueChange={setColumns}
        // Asked before each reflow, so a refused target never opens a gap.
        canMove={(from, to) => canMoveTask(from as TaskColumnId, to as TaskColumnId).allowed}
        getItemValue={(id: string) => id}
        onMove={handleMove}
        // A refused drop, a release over nothing, or Escape: the hover reflow has
        // already moved the card and only this puts it back.
        onDragDiscarded={restoreArrangement}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) =>
              `Picked up ${byId.get(String(active.id))?.title ?? 'task'}.`,
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
        {/* The board is a horizontal scroller at every width. Five columns squeezed
          into a grid meant each one got whatever was left over, and below xl
          the grid wrapped them onto a second row and the board was gone. Now a
          column has a floor width (set on the column itself), grows into spare
          room when the five fit, and the row scrolls sideways when they do not.

          Below md the columns take the phone's width and the row snaps — one
          column at a time, the next peeking so it is obvious you can swipe.

          gap-2 between the panels. Each one already draws its own border and
          fill, so the gutter only has to keep two edges apart — 12px of it was
          board-wide dead space in a view that is short of width, not long on
          it. The phone row keeps a wider gap, where the space is what separates
          one swiped column from the next rather than a border. */}
        {/* `py-1`: the columns are `h-full` inside this `overflow-y-hidden`
            strip, so with zero clearance their own top and bottom edges sat
            flush against the clip boundary — the rounded corner and the
            `shadow-xs` a column draws itself had no room to render and read
            as cut off flat (elli-ui#1140). */}
        <KanbanBoard className="scrollbar-on-hover flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 md:snap-none md:gap-2">
          {/* Columns are deliberately not `disabled`: useSortable's disabled turns
            off the droppable as well as the draggable, which would make an empty
            column refuse drops. Column drags are harmless here — onValueChange
            applies nothing, so reordering columns is a no-op. */}
          {TASK_COLUMNS.map((columnId) => {
            const cards = cardsIn(columnId);
            return (
              <TaskBoardColumn
                key={columnId}
                columnId={columnId}
                tasks={cards}
                byId={byId}
                homeOf={homeOf}
                now={now}
              >
                {cards.map((task) => (
                  <TaskBoardCard
                    key={task.id}
                    task={task}
                    now={now}
                    isBusy={busyTaskId === task.id}
                    justLanded={justLandedTaskId === task.id}
                    onOpen={onOpenTask}
                    onComplete={onCompleteTask}
                    onShiftDueDate={onShiftDueDate}
                    onReassign={onReassign}
                    onPriorityChange={onPriorityChange}
                    onCourtChange={onCourtChange}
                  />
                ))}
              </TaskBoardColumn>
            );
          })}
        </KanbanBoard>

        {/* Without children the overlay renders an empty box, so a dragged card
          vanished into a faded outline. Render the real card instead, so it
          follows the cursor and stays legible the whole way across.

          Lifted, not just floating: a touch larger, tilted a degree, and with
          a deeper shadow than the cards on the board, so the one in the hand
          is unmistakably off the surface. Transform-only, so it costs the
          compositor nothing per frame. */}
        {/* shadow-[0_1px_4px_rgba(0,0,0,0.14)] off */}
        <KanbanOverlay className="rotate-1 scale-102 rounded-xl will-change-transform">
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
    </div>
  );
}
