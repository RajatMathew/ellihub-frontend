import * as React from 'react';
import { Fragment, type CSSProperties, type ReactNode } from 'react';

import {
  flexRender,
  type Cell,
  type Column,
  type Header,
  type HeaderGroup,
  type Row,
} from '@tanstack/react-table';
import { cva } from 'class-variance-authority';

import { useDataGrid } from '@app/components/ui/data-grid';
import { Skeleton } from '@app/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { cn } from '@app/lib/utils';

const headerCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2.5 h-8',
      default: 'px-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const bodyCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2.5 py-2',
      default: 'px-4 py-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const fallbackSkeletonWidths = ['w-32', 'w-24', 'w-40', 'w-28', 'w-20', 'w-36'] as const;

/**
 * `align` on a column's meta drives both the head and the body.
 *
 * The head cannot use `text-align`: a sortable header renders a flex row, which
 * ignores it. So the head aligns with `justify-*` on that row and the body with
 * `text-*` on the cell. Declaring alignment once and applying the right rule to
 * each is the whole point — see `ColumnMeta.align`.
 */
const headerAlignClasses = {
  start: '',
  center: 'justify-center text-center',
  end: 'justify-end text-end',
} as const;

const cellAlignClasses = {
  start: '',
  center: 'text-center',
  end: 'text-end',
} as const;

function getPinningStyles<TData>(column: Column<TData>): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

function DataGridTableBase({ children }: { children: ReactNode }) {
  const { isLoading, props } = useDataGrid();

  return (
    <table
      data-slot="data-grid-table"
      aria-busy={isLoading}
      aria-label={props.tableAriaLabel}
      className={cn(
        'w-full align-middle caption-bottom text-left rtl:text-right text-foreground font-normal text-sm',
        !props.tableLayout?.columnsDraggable && 'border-separate border-spacing-0',
        props.tableLayout?.width === 'fixed' ? 'table-fixed' : 'table-auto',
        props.tableClassNames?.base
      )}
    >
      {children}
    </table>
  );
}

function DataGridTableFallbackSkeleton({ columnIndex }: { columnIndex: number }) {
  return (
    <Skeleton
      className={cn(
        'h-3.5 max-w-full rounded-sm',
        fallbackSkeletonWidths[columnIndex % fallbackSkeletonWidths.length]
      )}
    />
  );
}

function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <thead
      className={cn(
        props.tableClassNames?.header,
        props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky
      )}
    >
      {children}
    </thead>
  );
}

function DataGridTableHeadRow<TData>({
  children,
  headerGroup,
}: {
  children: ReactNode;
  headerGroup: HeaderGroup<TData>;
}) {
  const { props } = useDataGrid();

  return (
    <tr
      key={headerGroup.id}
      className={cn(
        'bg-muted/40',
        props.tableLayout?.headerBorder && '[&>th]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped && 'bg-transparent',
        props.tableLayout?.headerBackground === false && 'bg-transparent',
        props.tableClassNames?.headerRow
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column } = header;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right');
  const headerCellSpacing = headerCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <th
      key={header.id}
      ref={dndRef}
      style={{
        ...(props.tableLayout?.width === 'fixed' && {
          width: `${header.getSize()}px`,
        }),
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
      className={cn(
        'relative h-10 text-left rtl:text-right align-middle font-normal text-accent-foreground [&:has([role=checkbox])]:pe-0',
        headerCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable && column.getCanResize() && 'truncate',
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs',
        headerAlignClasses[header.column.columnDef.meta?.align ?? 'start'],
        // Only when the column is actually being pushed off the start edge. The
        // header's content is a flex row (sortable) or an inline-flex label
        // (plain), and `justify-*` cannot move either unless it fills the cell —
        // but stretching it unconditionally also stretches content that is not a
        // label at all, which is what pulled the select-all checkbox into a
        // 44px-wide box.
        header.column.columnDef.meta?.align &&
          header.column.columnDef.meta.align !== 'start' &&
          '[&>*]:w-full',
        header.column.columnDef.meta?.headerClassName,
        column.getIndex() === 0 || column.getIndex() === header.headerGroup.headers.length - 1
          ? props.tableClassNames?.edgeCell
          : ''
      )}
    >
      {children}
    </th>
  );
}

function DataGridTableHeadRowCellResize<TData>({ header }: { header: Header<TData, unknown> }) {
  const { column } = header;

  return (
    <div
      {...{
        onDoubleClick: () => column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className:
          'absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px',
      }}
    />
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>;
}

function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0',
        props.tableLayout?.rowRounded &&
          '[&_td:first-child]:rounded-s-lg [&_td:last-child]:rounded-e-lg',
        props.tableClassNames?.body
      )}
    >
      {children}
    </tbody>
  );
}

function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  const { table, props } = useDataGrid();

  return (
    <tr
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          'border-b border-border [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped && 'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '*:first:relative',
        props.tableClassNames?.bodyRow
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData>({
  children,
  column,
}: {
  children: ReactNode;
  column: Column<TData>;
}) {
  const { props, table } = useDataGrid();
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      className={cn(
        'align-middle',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable && column.getCanResize() && 'truncate',
        cellAlignClasses[column.columnDef.meta?.align ?? 'start'],
        // A skeleton is an inline block, so the cell's text-align does not move
        // it. Push it over explicitly or the loading row sits left of the data.
        column.columnDef.meta?.align === 'end' && '[&>*]:ms-auto',
        column.columnDef.meta?.align === 'center' && '[&>*]:mx-auto',
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs"',
        column.getIndex() === 0 || column.getIndex() === table.getVisibleFlatColumns().length - 1
          ? props.tableClassNames?.edgeCell
          : ''
      )}
    >
      {children}
    </td>
  );
}

function DataGridTableBodyRow<TData>({
  children,
  row,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  row: Row<TData>;
  dndRef?: React.Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) {
  const { props, table } = useDataGrid();

  return (
    <tr
      ref={dndRef}
      style={{ ...(dndStyle ? dndStyle : null) }}
      data-state={table.options.enableRowSelection && row.getIsSelected() ? 'selected' : undefined}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          'border-b border-border [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped && 'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '*:first:relative',
        props.tableClassNames?.bodyRow
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData>({ row }: { row: Row<TData> }) {
  const { props, table } = useDataGrid();

  return (
    <tr className={cn(props.tableLayout?.rowBorder && '[&:not(:last-child)>td]:border-b')}>
      <td colSpan={row.getVisibleCells().length}>
        {table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(row.original)}
      </td>
    </tr>
  );
}

function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column, row } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right');
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });
  const textOverflow = cell.column.columnDef.meta?.textOverflow;
  const preserveTruncatedCellLayout = cell.column.columnDef.meta?.preserveTruncatedCellLayout;
  const alwaysShowTooltip = cell.column.columnDef.meta?.alwaysShowTooltip;
  const cellValue = cell.getValue();
  const tooltipContent =
    cell.column.columnDef.meta?.tooltipContent?.(row.original, cellValue) ??
    (typeof cellValue === 'string' || typeof cellValue === 'number' ? cellValue : undefined);
  const shouldWrapContent = textOverflow === 'truncate' || textOverflow === 'scroll';
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    if (textOverflow !== 'truncate' || alwaysShowTooltip) {
      setIsOverflowing(false);
      return;
    }

    const element = contentRef.current;
    if (!element) return;

    const hasOverflow = (target: Element) =>
      target.scrollWidth > target.clientWidth || target.scrollHeight > target.clientHeight;
    const checkOverflow = () => {
      setIsOverflowing(
        hasOverflow(element) || Array.from(element.querySelectorAll('*')).some(hasOverflow)
      );
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, [alwaysShowTooltip, children, textOverflow, tooltipContent]);

  const content = shouldWrapContent ? (
    <div
      ref={contentRef}
      className={cn(
        'min-w-0 max-w-full',
        textOverflow === 'truncate' && !preserveTruncatedCellLayout && 'truncate',
        textOverflow === 'scroll' &&
          'max-h-24 overflow-auto whitespace-pre-wrap break-words pr-1 text-left'
      )}
    >
      {children}
    </div>
  ) : textOverflow === 'wrap' ? (
    <div className="min-w-0 max-w-full whitespace-normal break-words">{children}</div>
  ) : (
    children
  );

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}
      style={{
        ...(props.tableLayout?.columnsPinnable && column.getCanPin() && getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
      className={cn(
        'align-middle',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable && column.getCanResize() && 'truncate',
        cellAlignClasses[cell.column.columnDef.meta?.align ?? 'start'],
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs"',
        column.getIndex() === 0 || column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : ''
      )}
    >
      {textOverflow === 'truncate' && tooltipContent && (alwaysShowTooltip || isOverflowing) ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-96 whitespace-pre-wrap break-words text-left">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
    </td>
  );
}

function DataGridTableEmpty() {
  const { table, props } = useDataGrid();
  // Visible columns, not all of them: `getAllColumns` counts the ones hidden by
  // `columnVisibility`, which made the empty row one cell too wide for exactly
  // the users a permission had hidden a column from.
  const totalColumns = table.getVisibleFlatColumns().length;

  return (
    <tr>
      <td colSpan={totalColumns} className="text-center text-muted-foreground py-6">
        {props.emptyMessage || 'No data available'}
      </td>
    </tr>
  );
}

function DataGridTable<TData>() {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>, index) => {
          return (
            <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
              {headerGroup.headers.map((header, index) => {
                const { column } = header;

                return (
                  <DataGridTableHeadRowCell header={header} key={index}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {props.tableLayout?.columnsResizable && column.getCanResize() && (
                      <DataGridTableHeadRowCellResize header={header} />
                    )}
                  </DataGridTableHeadRowCell>
                );
              })}
            </DataGridTableHeadRow>
          );
        })}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

      <DataGridTableBody>
        {/* `pageSize` rows is the right guess where this now runs: with
            `useListQuery` keeping the previous page's data, a filter or sort
            change never empties the body, so skeletons only appear on a genuine
            first load — where the page size is all there is to go on. The card's
            height is held separately, in DataGridSection. */}
        {props.loadingMode === 'skeleton' && isLoading && pagination?.pageSize ? (
          Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
            <DataGridTableBodyRowSkeleton key={rowIndex}>
              {table.getVisibleFlatColumns().map((column, colIndex) => {
                return (
                  <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                    {column.columnDef.meta?.skeleton ?? (
                      <DataGridTableFallbackSkeleton columnIndex={colIndex} />
                    )}
                  </DataGridTableBodyRowSkeletonCell>
                );
              })}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row: Row<TData>, index) => {
            return (
              <Fragment key={row.id}>
                <DataGridTableBodyRow row={row} key={index}>
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>, colIndex) => {
                    return (
                      <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </DataGridTableBodyRowCell>
                    );
                  })}
                </DataGridTableBodyRow>
                {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
              </Fragment>
            );
          })
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

export {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
};
