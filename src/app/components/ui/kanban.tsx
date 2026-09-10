/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';

import {
  defaultDropAnimation,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@app/lib/utils';

interface KanbanContextProps<T> {
  columns: Record<string, T[]>;
  setColumns: (columns: Record<string, T[]>) => void;
  getItemId: (item: T) => string;
  columnIds: string[];
  activeId: UniqueIdentifier | null;
  setActiveId: (id: UniqueIdentifier | null) => void;
  findContainer: (id: UniqueIdentifier) => string | undefined;
  isColumn: (id: UniqueIdentifier) => boolean;
  itemStrategy: SortingStrategy;
}

const KanbanContext = React.createContext<KanbanContextProps<any>>({
  columns: {},
  setColumns: () => {},
  getItemId: () => '',
  columnIds: [],
  activeId: null,
  setActiveId: () => {},
  findContainer: () => undefined,
  isColumn: () => false,
  itemStrategy: verticalListSortingStrategy,
});

const ColumnContext = React.createContext<{
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  attributes: {} as DraggableAttributes,
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

const ItemContext = React.createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false,
});

const dropAnimationConfig: DropAnimation = {
  ...defaultDropAnimation,
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

export interface KanbanMoveEvent {
  event: DragEndEvent;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
}

export interface KanbanRootProps<T> {
  value: Record<string, T[]>;
  onValueChange: (value: Record<string, T[]>) => void;
  getItemValue: (item: T) => string;
  children: React.ReactNode;
  className?: string;
  onMove?: (event: KanbanMoveEvent) => void;
  /**
   * Asked before the board reflows under a hovered card. Return false and the
   * columns stay put, so an illegal target never opens a gap — the absence of
   * the gap is itself the feedback. Omit it and every hover reflows.
   */
  canMove?: (from: string, to: string) => boolean;
  /**
   * A drag that ended without anything being applied — released over nothing,
   * or cancelled with Escape.
   *
   * The hover reflow is not undone by either: a card dragged across a legal
   * column on its way somewhere else has already been moved into it, and a drag
   * that then ends nowhere leaves it sitting there. The owner of the value has
   * to put its arrangement back, and this is how it hears that it should.
   */
  onDragDiscarded?: () => void;
  /**
   * How the cards in a column move while one of them is dragged over it.
   *
   * The default slides the others apart to open a gap under the dragged card.
   * An owner that draws its own drop indicator wants none of that: the gap and
   * the indicator are two answers to "where will this land", and the sliding
   * is done with transforms the indicator does not take part in, so the two
   * drift apart. Pass a strategy that returns null and the cards hold still.
   */
  itemStrategy?: SortingStrategy;
  /**
   * The index a card slides into when it is dragged over another column.
   *
   * The reflow inserts it wherever the pointer is. An owner with placement
   * rules — a card may only sit among its own priority, say — can pin the index
   * here, so the ghost the reflow shows and the slot the drop will use agree.
   */
  resolveIndex?: (container: string, itemId: string, proposedIndex: number) => number;
  /**
   * Screen-reader announcements for the drag lifecycle. Without these a drag is
   * silent to assistive tech, which the keyboard sensor otherwise supports.
   */
  accessibility?: React.ComponentProps<typeof DndContext>['accessibility'];
}

function Kanban<T>({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  onMove,
  canMove,
  onDragDiscarded,
  itemStrategy = verticalListSortingStrategy,
  resolveIndex,
  accessibility,
}: KanbanRootProps<T>) {
  const columns = value;
  const setColumns = onValueChange;
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  // Mouse and touch are separated rather than handled by one PointerSensor,
  // because the two gestures mean different things. A 10px mouse drag is a drag.
  // A 10px finger drag is a scroll — with a pointer sensor the board could not be
  // scrolled or swiped on a phone at all without picking up a card. Touch instead
  // waits for a short press, which is how every board app behaves on a phone.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columnIds = React.useMemo(() => Object.keys(columns), [columns]);

  const isColumn = React.useCallback(
    (id: UniqueIdentifier) => columnIds.includes(id as string),
    [columnIds]
  );

  const findContainer = React.useCallback(
    (id: UniqueIdentifier) => {
      if (isColumn(id)) return id as string;
      return columnIds.find((key) => columns[key].some((item) => getItemValue(item) === id));
    },
    [columns, columnIds, getItemValue, isColumn]
  );

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  // The pointer decides what is being hovered, not the dragged card's box.
  //
  // dnd-kit's default scores every droppable by how much of it the dragged box
  // overlaps — and every card is a droppable, not only the columns. That score
  // favours small targets: a card's edge clipping one card in the next column
  // outscores most of the card sitting over this column's open space, so the
  // wrong column lit up, the right one never did, and which won depended on
  // card sizes and edges the user could not see. Whatever is under the cursor
  // is what a person means. The rectangle fallback is for the keyboard sensor,
  // which has no pointer to ask.
  const collisionDetection = React.useCallback<CollisionDetection>((args) => {
    const underPointer = pointerWithin(args);
    return underPointer.length > 0 ? underPointer : rectIntersection(args);
  }, []);

  // Escape mid-drag left the card wherever the hover reflow had put it, and left
  // the board thinking a drag was still in progress.
  const handleDragCancel = React.useCallback(() => {
    setActiveId(null);
    onDragDiscarded?.();
  }, [onDragDiscarded]);

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      if (isColumn(active.id)) return;

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      // Cards slide apart to show where this one lands — but only if it may
      // land there.
      if (activeContainer && overContainer && canMove && !canMove(activeContainer, overContainer)) {
        return;
      }

      // Only handle moving items between different columns
      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return;
      }

      const activeItems = columns[activeContainer];
      const overItems = columns[overContainer];

      const activeIndex = activeItems.findIndex((item: T) => getItemValue(item) === active.id);
      let overIndex = overItems.findIndex((item: T) => getItemValue(item) === over.id);

      // If dropping on the column itself, not an item
      if (isColumn(over.id)) {
        overIndex = overItems.length;
      }

      if (resolveIndex) overIndex = resolveIndex(overContainer, String(active.id), overIndex);

      // Copy, never splice. `activeItems` is the array held in state, and the
      // owner may be holding the very same array — the task board seeds its
      // state straight from a memo — so splicing here reached back into that
      // memo and removed the card from it for good. Putting the arrangement
      // back afterwards then restored a list the card was already missing from,
      // and it rendered in no column at all.
      const movedItem = activeItems[activeIndex];
      if (!movedItem) return;

      const newActiveItems = activeItems.filter((_, index) => index !== activeIndex);
      const newOverItems = [...overItems];
      newOverItems.splice(overIndex, 0, movedItem);

      setColumns({
        ...columns,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      });
    },
    [findContainer, getItemValue, isColumn, setColumns, columns, canMove, resolveIndex]
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      // Released over nothing. The reflow that happened on the way is still
      // applied, so the owner has to be told to put its arrangement back.
      if (!over) {
        onDragDiscarded?.();
        return;
      }

      // Handle item move callback
      if (onMove && !isColumn(active.id)) {
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        if (activeContainer && overContainer) {
          const activeIndex = columns[activeContainer].findIndex(
            (item: T) => getItemValue(item) === active.id
          );
          const overIndex = isColumn(over.id)
            ? columns[overContainer].length
            : columns[overContainer].findIndex((item: T) => getItemValue(item) === over.id);

          onMove({
            event,
            activeContainer,
            activeIndex,
            overContainer,
            overIndex,
          });
        }
        return;
      }

      // Handle column reordering
      if (isColumn(active.id) && isColumn(over.id)) {
        const activeIndex = columnIds.indexOf(active.id as string);
        const overIndex = columnIds.indexOf(over.id as string);
        if (activeIndex !== overIndex) {
          const newOrder = arrayMove(Object.keys(columns), activeIndex, overIndex);
          const newColumns: Record<string, T[]> = {};
          newOrder.forEach((key) => {
            newColumns[key] = columns[key];
          });
          setColumns(newColumns);
        }
        return;
      }

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      // Handle item reordering within the same column
      if (activeContainer && overContainer && activeContainer === overContainer) {
        const container = activeContainer;
        const activeIndex = columns[container].findIndex(
          (item: T) => getItemValue(item) === active.id
        );
        const overIndex = columns[container].findIndex((item: T) => getItemValue(item) === over.id);

        if (activeIndex !== overIndex) {
          setColumns({
            ...columns,
            [container]: arrayMove(columns[container], activeIndex, overIndex),
          });
        }
      }
    },
    [columnIds, columns, findContainer, getItemValue, isColumn, setColumns, onMove, onDragDiscarded]
  );

  const contextValue = React.useMemo(
    () => ({
      columns,
      setColumns,
      getItemId: getItemValue,
      columnIds,
      activeId,
      setActiveId,
      findContainer,
      isColumn,
      itemStrategy,
    }),
    [columns, setColumns, getItemValue, columnIds, activeId, findContainer, isColumn, itemStrategy]
  );

  return (
    <KanbanContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // Measure the droppables continuously rather than once when the drag
        // starts. The default caches every card's position at pick-up, which is
        // fine for a static list and wrong for this one: the cards animate as
        // they rearrange, so the cached boxes describe where each card *was*.
        // Hit-testing then looks for cards in their old positions and mostly
        // misses — the column only lights up where the old and new boxes still
        // happen to overlap.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={accessibility}
      >
        <div data-slot="kanban" data-dragging={activeId !== null} className={cn(className)}>
          {children}
        </div>
      </DndContext>
    </KanbanContext.Provider>
  );
}

export interface KanbanBoardProps {
  className?: string;
  children: React.ReactNode;
}

function KanbanBoard({ children, className }: KanbanBoardProps) {
  const { columnIds } = React.useContext(KanbanContext);

  return (
    <SortableContext items={columnIds} strategy={rectSortingStrategy}>
      <div
        data-slot="kanban-board"
        className={cn('grid auto-rows-fr sm:grid-cols-3 gap-4', className)}
      >
        {children}
      </div>
    </SortableContext>
  );
}

export interface KanbanColumnProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function KanbanColumn({ value, className, children, disabled }: KanbanColumnProps) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled,
  });

  const { activeId, isColumn } = React.useContext(KanbanContext);
  const isColumnDragging = activeId ? isColumn(activeId) : false;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  } as React.CSSProperties;

  return (
    <ColumnContext.Provider
      value={{ attributes, listeners, isDragging: isColumnDragging, disabled }}
    >
      <div
        data-slot="kanban-column"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        className={cn(
          'group/kanban-column flex flex-col',
          isSortableDragging && 'opacity-50',
          disabled && 'opacity-50',
          className
        )}
      >
        {children}
      </div>
    </ColumnContext.Provider>
  );
}

export interface KanbanColumnHandleProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  cursor?: boolean;
}

function KanbanColumnHandle({
  asChild,
  className,
  children,
  cursor = true,
}: KanbanColumnHandleProps) {
  const { attributes, listeners, isDragging, disabled } = React.useContext(ColumnContext);

  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="kanban-column-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...attributes}
      {...listeners}
      className={cn(
        'opacity-0 transition-opacity group-hover/kanban-column:opacity-100',
        cursor && (isDragging ? 'cursor-grabbing!' : 'cursor-grab!'),
        className
      )}
    >
      {children}
    </Comp>
  );
}

export interface KanbanItemProps {
  value: string;
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function KanbanItem({ value, asChild = false, className, children, disabled }: KanbanItemProps) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled,
  });

  const { activeId, isColumn } = React.useContext(KanbanContext);
  const isItemDragging = activeId ? !isColumn(activeId) : false;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  } as React.CSSProperties;

  const Comp = asChild ? Slot : 'div';

  return (
    <ItemContext.Provider value={{ listeners, isDragging: isItemDragging, disabled }}>
      <Comp
        data-slot="kanban-item"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(isSortableDragging && 'opacity-50', disabled && 'opacity-50', className)}
      >
        {children}
      </Comp>
    </ItemContext.Provider>
  );
}

export interface KanbanItemHandleProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  cursor?: boolean;
}

function KanbanItemHandle({ asChild, className, children, cursor = true }: KanbanItemHandleProps) {
  const { listeners, isDragging, disabled } = React.useContext(ItemContext);

  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="kanban-item-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...listeners}
      className={cn(cursor && (isDragging ? 'cursor-grabbing!' : 'cursor-grab!'), className)}
    >
      {children}
    </Comp>
  );
}

export interface KanbanColumnContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function KanbanColumnContent({ value, className, children }: KanbanColumnContentProps) {
  const { columns, getItemId, itemStrategy } = React.useContext(KanbanContext);

  const itemIds = React.useMemo(() => columns[value].map(getItemId), [columns, getItemId, value]);

  return (
    <SortableContext items={itemIds} strategy={itemStrategy}>
      <div data-slot="kanban-column-content" className={cn('flex flex-col gap-2', className)}>
        {children}
      </div>
    </SortableContext>
  );
}

export interface KanbanOverlayProps {
  className?: string;
  children?:
    | React.ReactNode
    | ((params: { value: UniqueIdentifier; variant: 'column' | 'item' }) => React.ReactNode);
}

function KanbanOverlay({ children, className }: KanbanOverlayProps) {
  const { activeId, isColumn } = React.useContext(KanbanContext);
  const [dimensions, setDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  React.useEffect(() => {
    if (activeId) {
      const element = document.querySelector(
        `[data-slot="kanban-${isColumn(activeId) ? 'column' : 'item'}"][data-value="${activeId}"]`
      );
      if (element) {
        const rect = element.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    } else {
      setDimensions(null);
    }
  }, [activeId, isColumn]);

  const style = {
    width: dimensions?.width,
    height: dimensions?.height,
  } as React.CSSProperties;

  const content = React.useMemo(() => {
    if (!activeId) return null;
    if (typeof children === 'function') {
      return children({
        value: activeId,
        variant: isColumn(activeId) ? 'column' : 'item',
      });
    }
    return children;
  }, [activeId, children, isColumn]);

  return (
    <DragOverlay dropAnimation={dropAnimationConfig}>
      <div
        data-slot="kanban-overlay"
        data-dragging={true}
        style={style}
        className={cn('pointer-events-none', className, activeId ? 'cursor-grabbing!' : '')}
      >
        {content}
      </div>
    </DragOverlay>
  );
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanColumnContent,
  KanbanOverlay,
};
