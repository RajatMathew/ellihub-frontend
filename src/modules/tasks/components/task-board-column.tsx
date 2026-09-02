import type { ReactNode } from 'react';

import { KanbanColumn, KanbanColumnContent } from '@/app/components/ui/kanban';
import { cn } from '@/app/lib/utils';
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
        'rounded-lg bg-muted/40 p-3 transition-colors',
        isWelcome && 'bg-primary/5 ring-2 ring-primary/40',
        isForbidden && 'bg-destructive/10 ring-2 ring-destructive/50'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
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
          className="mb-2 flex items-start gap-1.5 rounded-md bg-destructive/15 p-2 text-xs font-medium text-destructive"
        >
          <Ban aria-hidden className="mt-0.5 size-3 shrink-0" />
          {verdict.reason}
        </p>
      ) : null}

      <KanbanColumnContent value={columnId} className="flex flex-col gap-2">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">column clear</p>
        ) : (
          children
        )}
      </KanbanColumnContent>
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
