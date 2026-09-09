import type { ReactNode } from 'react';

import { KanbanColumn, KanbanColumnContent } from '@/app/components/ui/kanban';
import { cn } from '@/app/lib/utils';
import { useScrollEdges } from '@/modules/tasks/hooks/use-scroll-edges';
import { withDropIndicator } from '@/modules/tasks/lib/drop-indicator';
import {
  arrivalIndex,
  canMoveTask,
  columnForTask,
  columnHeading,
  dropMovesTask,
  resolveDropIndex,
  TASK_COLUMN_TONES,
  type TaskColumnId,
} from '@/modules/tasks/lib/task-board';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { useDndContext } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * One column of the board, and the live feedback for whether the card you are
 * dragging may land here.
 *
 * A refused drop used to be silent until you let go. Reading the drag straight
 * from dnd-kit lets the column say no while you are still holding the card, so
 * the rule is visible before you commit to it rather than after.
 */
export function TaskBoardColumn({
  columnId,
  tasks,
  byId,
  now,
  children,
}: {
  columnId: TaskColumnId;
  tasks: Task[];
  byId: Map<string, Task>;
  now: Date;
  children: ReactNode;
}) {
  const { active, over } = useDndContext();
  const { ref: scrollRef, scrollEdgeProps } = useScrollEdges<HTMLDivElement>();

  const draggedTask = active ? byId.get(String(active.id)) : undefined;
  const hoveredColumn = over ? resolveColumn(over.id, byId, now) : null;
  const isHovered = Boolean(draggedTask && hoveredColumn === columnId);

  const verdict =
    draggedTask && isHovered
      ? canMoveTask(columnForTask(draggedTask, now), columnId)
      : { allowed: true as const, reason: undefined };

  const isForbidden = isHovered && !verdict.allowed;
  const isWelcome = isHovered && verdict.allowed;

  // The line always says where the card is going to end up, which is not always
  // where the cursor is. Dropping into a dated column places the card, so there
  // it follows the cursor, clamped to the card's own priority block. Completing
  // one is a state change rather than a placement — the card lands by priority
  // and then age however it got there — so there the line points at the slot it
  // will take.
  const dropSlot = (() => {
    if (!draggedTask || !isWelcome) return null;

    return columnId === 'COMPLETED'
      ? arrivalSlotFor(tasks, draggedTask)
      : dropSlotFor(tasks, draggedTask, over?.id, byId, {
          // Landing back on its own slot is only a no-op when the card is not
          // also changing column.
          sameColumn: columnForTask(draggedTask, now) === columnId,
        });
  })();

  return (
    <KanbanColumn
      value={columnId}
      className={cn(
        // The column owns its background and border; the card list inside it is
        // what scrolls, so the fade dissolves the cards rather than the column.
        // A panel that lifts off the page rather than a cell in a grid. Three
        // things do that together and none of them works alone: a fill with
        // enough contrast to read as its own surface, a border softened to half
        // strength so the edges stop drawing themselves, and a shadow to give
        // the whole thing a lift. At full-strength borders and a fainter fill it
        // read as ruled graph paper.
        'flex h-full min-h-0 flex-col rounded-lg border border-border/50 bg-muted/50 p-3 shadow-sm transition-colors',
        // A card wide enough to read, with the next column showing at the edge.
        'w-[85vw] shrink-0 snap-center sm:w-[60vw] md:w-auto md:shrink',
        isWelcome && 'bg-primary/5 ring-2 ring-primary/40',
        isForbidden && 'bg-destructive/10 ring-2 ring-destructive/50'
      )}
    >
      {/* The heading is ruled off from the cards, and carries the same faint
          shadow as the panel so it sits above them rather than beside them. The
          rule reaches the panel's inner edges to meet the border either side, so
          it bleeds back out through the p-3 and pays the padding again itself,
          and is softened to match. */}
      <div className="-mx-3 mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 pb-3 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className={cn('size-2 rounded-full', TASK_COLUMN_TONES[columnId])} aria-hidden />
          {columnHeading(columnId, now)}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      {/* The reason, not just a red border — colour alone is not a message. */}
      {isForbidden && verdict.reason ? (
        <p
          role="status"
          className="mb-2 flex shrink-0 items-start gap-1.5 rounded-md bg-destructive/15 p-2 text-xs font-medium text-destructive"
        >
          <Ban aria-hidden className="mt-0.5 size-3 shrink-0" />
          {verdict.reason}
        </p>
      ) : null}

      {/* The scroller is this wrapper rather than the sortable list inside it, so
          the mask and the scrollbar belong to us and the list stays a plain
          flex column. min-h-0 is what lets it shrink inside the flex column
          instead of pushing it taller; without it nothing ever scrolls. */}
      <div
        ref={scrollRef}
        {...scrollEdgeProps}
        className="scroll-fade scrollbar-on-hover min-h-0 flex-1 overflow-y-auto"
      >
        <KanbanColumnContent value={columnId} className="gap-2">
          {/* A card that leaves this column has to stay on screen long enough to
              be seen leaving. Without this it unmounts on the frame its status
              changes and the tick reads as the card being deleted rather than
              completed — the cards below still slide up, but after something
              that was never there. See TaskBoardCardSlot for the motion itself. */}
          <AnimatePresence initial={false}>{withDropIndicator(children, dropSlot)}</AnimatePresence>

          {/* Fades rather than appears. The last card out of a column is still
              on screen finishing its exit when this mounts, so a hard cut would
              put a "column clear" under a card that is plainly still there. */}
          {tasks.length === 0 ? (
            <motion.p
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 text-center text-xs text-muted-foreground"
            >
              column clear
            </motion.p>
          ) : null}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  );
}

/**
 * Which gap the drop indicator goes in, counted among the rendered cards.
 *
 * The aim is read from whatever is hovered, clamped to the dragged card's own
 * priority block, and then translated back into a position among the children —
 * which still include the dragged card, so the two counts differ by one below
 * its slot.
 *
 * Null when there is nowhere legal and distinct to point at.
 */
function dropSlotFor(
  tasks: Task[],
  dragged: Task,
  overId: string | number | undefined,
  byId: Map<string, Task>,
  { sameColumn }: { sameColumn: boolean }
): number | null {
  if (overId === undefined) return null;

  const activeIndex = tasks.findIndex((task) => task.id === dragged.id);
  if (activeIndex === -1) return null;

  // Hovering the column itself rather than a card means the end of the list.
  const overTask = byId.get(String(overId));
  const aim = overTask
    ? tasks.findIndex((task) => task.id === overTask.id)
    : Math.max(0, tasks.length - 1);
  if (aim === -1) return null;

  const index = resolveDropIndex(tasks, dragged.id, aim);

  // The clamp lands a card back on its own slot whenever it is aimed outside
  // its block from the near end. Within its own column that is a move that is
  // not going to happen, and drawing a line would promise one. Arriving from
  // another column it is going somewhere regardless, so the line stays.
  if (sameColumn && !dropMovesTask(tasks, dragged.id, index)) return null;

  return index < activeIndex ? index : index + 1;
}

/**
 * Which gap a card arriving from another column will open, among the rendered
 * cards.
 *
 * `arrivalIndex` counts against the column without the arriving card; the board
 * may already have slid it in while the drag is in flight, so the answer is
 * shifted by one below wherever it currently sits.
 */
function arrivalSlotFor(tasks: Task[], dragged: Task): number {
  const index = arrivalIndex(tasks, dragged);
  const listedAt = tasks.findIndex((task) => task.id === dragged.id);

  if (listedAt === -1) return index;
  return index < listedAt ? index : index + 1;
}

/** Which column something being hovered belongs to — a column id, or a card in one. */
function resolveColumn(
  overId: string | number,
  byId: Map<string, Task>,
  now: Date
): TaskColumnId | null {
  const overTask = byId.get(String(overId));
  if (overTask) return columnForTask(overTask, now);
  return String(overId) as TaskColumnId;
}
