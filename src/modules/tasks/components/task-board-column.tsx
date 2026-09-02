import type { ReactNode } from 'react';

import { KanbanColumn, KanbanColumnContent } from '@/app/components/ui/kanban';
import { cn } from '@/app/lib/utils';
import { useScrollEdges } from '@/modules/tasks/hooks/use-scroll-edges';
import {
  canMoveTask,
  columnForTask,
  TASK_COLUMN_LABELS,
  TASK_COLUMN_TONES,
  type TaskColumnId,
} from '@/modules/tasks/lib/task-board';
import type { Task } from '@/modules/tasks/schemas/task.schema';
import { useDndContext } from '@dnd-kit/core';
import { Ban } from 'lucide-react';

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

  return (
    <KanbanColumn
      value={columnId}
      className={cn(
        // The column owns its background and border; the card list inside it is
        // what scrolls, so the fade dissolves the cards rather than the column.
        'flex h-full min-h-0 flex-col rounded-lg bg-muted/40 p-3 transition-colors',
        // A card wide enough to read, with the next column showing at the edge.
        'w-[85vw] shrink-0 snap-center sm:w-[60vw] md:w-auto md:shrink',
        isWelcome && 'bg-primary/5 ring-2 ring-primary/40',
        isForbidden && 'bg-destructive/10 ring-2 ring-destructive/50'
      )}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className={cn('size-2 rounded-full', TASK_COLUMN_TONES[columnId])} aria-hidden />
          {TASK_COLUMN_LABELS[columnId]}
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
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">column clear</p>
          ) : (
            children
          )}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  );
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
