import { memo } from 'react';

import { KanbanItem, KanbanItemHandle } from '@/app/components/ui/kanban';
import { TaskBoardCardSlot } from '@/modules/tasks/components/task-board-card-slot';
import { TaskCard } from '@/modules/tasks/components/task-card';
import type { Task, TaskCourt, TaskPriority } from '@/modules/tasks/schemas/task.schema';

/**
 * One card on the board: the slot that animates it, the sortable that drags
 * it, the handle that picks it up, and the card itself.
 *
 * Memoised, and that is the reason it is its own component. The board
 * re-renders on every hover reflow — each time the dragged card slides into a
 * new gap — and used to rebuild every card's element tree with fresh closures
 * each time, so thirty cards' worth of menus and popovers rendered again for
 * a change that touched none of them. The per-task closures are made here,
 * from handlers that are stable across the drag, so a reflow now re-renders
 * only the sortable wrappers dnd-kit itself subscribes.
 */
export const TaskBoardCard = memo(function TaskBoardCard({
  task,
  now,
  isBusy,
  justLanded,
  onOpen,
  onComplete,
  onShiftDueDate,
  onReassign,
  onPriorityChange,
  onCourtChange,
}: {
  task: Task;
  now: Date;
  isBusy: boolean;
  justLanded: boolean;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReassign: (task: Task, assigneeId: string | null) => void;
  onPriorityChange: (task: Task, priority: TaskPriority) => void;
  onCourtChange: (task: Task, court: TaskCourt) => void;
}) {
  return (
    <TaskBoardCardSlot>
      {/* `opacity-100` overrides the primitive's half-faded copy while this
          card is being dragged: the slot below stands in for it instead. */}
      <KanbanItem value={task.id} className="group/item opacity-100">
        {/* KanbanItem keeps the drag listeners in context rather than
            spreading them, so a card only becomes draggable once it contains
            a handle. The whole card is the handle; the sensor's 10px activation
            distance leaves the buttons inside clickable. */}
        <KanbanItemHandle asChild>
          {/* While the card is in the air this is the slot it left, and the
              slot the hover reflow carries into whichever column the pointer
              is over — a muted blank the card's exact size, which is a clearer
              "it lands here" than a second, faded copy of the card under the
              one following the cursor. The card is hidden, not removed, so
              the slot keeps its size and the drop animation has a box to
              return to. */}
          <div className="touch-manipulation rounded-lg group-data-[dragging=true]/item:bg-muted group-data-[dragging=true]/item:[&>*]:invisible">
            <TaskCard
              task={task}
              now={now}
              isBusy={isBusy}
              justLanded={justLanded}
              onOpen={onOpen}
              onComplete={onComplete}
              onShiftDueDate={onShiftDueDate}
              onReassign={(assigneeId) => onReassign(task, assigneeId)}
              onPriorityChange={(priority) => onPriorityChange(task, priority)}
              onCourtChange={(court) => onCourtChange(task, court)}
            />
          </div>
        </KanbanItemHandle>
      </KanbanItem>
    </TaskBoardCardSlot>
  );
});
