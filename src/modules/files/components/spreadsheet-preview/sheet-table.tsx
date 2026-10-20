import { memo, type CSSProperties, type Ref } from 'react';

import type { SheetGrid } from '@/modules/files/lib/spreadsheet/sheet-grid';

import { SheetCell } from './sheet-cell';

export const ROW_HEADER_WIDTH_PX = 44;

/**
 * The sheet's table, column letters, row numbers and cells. Memoized and kept
 * free of `zoom`, so a zoom step re-renders only the box around it — a sheet
 * can hold 50,000 cells, and reconciling them on every pinch frame was the lag.
 */
export const SheetTable = memo(function SheetTable({
  ref,
  grid,
  columnWidths,
  hashed,
  style,
  onOpenSheet,
}: {
  ref: Ref<HTMLTableElement>;
  grid: SheetGrid;
  columnWidths: number[];
  hashed: Map<string, string>;
  style: CSSProperties;
  onOpenSheet: (sheet: string) => void;
}) {
  return (
    <table
      ref={ref}
      className="table-fixed border-separate border-spacing-0 bg-sheet-canvas text-sheet-ink"
      style={style}
    >
      <colgroup>
        <col style={{ width: ROW_HEADER_WIDTH_PX }} />
        {grid.columns.map((column, position) => (
          <col key={column.index} style={{ width: columnWidths[position] }} />
        ))}
      </colgroup>
      <thead>
        <tr className="h-5">
          <th
            aria-hidden="true"
            className="sticky top-0 left-0 z-30 border-r border-b border-sheet-gridline bg-sheet-header"
          />
          {grid.columns.map((column) => (
            // No side padding: a narrow column (a spacer A) would push its letter out of view.
            <th
              key={column.index}
              scope="col"
              className="sticky top-0 z-20 overflow-hidden border-r border-b border-sheet-gridline bg-sheet-header px-0 text-center font-sans text-xs font-normal whitespace-nowrap text-sheet-header-foreground"
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row) => (
          <tr key={row.index} style={{ height: row.heightPx }}>
            <th
              scope="row"
              className="sticky left-0 z-10 border-r border-b border-sheet-gridline bg-sheet-header px-1 text-center font-sans text-xs font-normal text-sheet-header-foreground"
            >
              {row.index + 1}
            </th>
            {row.cells.map((cell) => (
              <SheetCell
                key={cell.col}
                cell={cell}
                heightPx={row.heightPx}
                hashed={hashed.get(`${row.index}:${cell.col}`)}
                showGridLines={grid.showGridLines}
                onOpenSheet={onOpenSheet}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
});
