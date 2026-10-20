import type { SheetGrid } from '@/modules/files/lib/spreadsheet/sheet-grid';
import type { SheetLayout, Span } from '@/modules/files/lib/spreadsheet/sheet-layout';

/** Reads the table's layout. Offsets are divided by `zoom`, since the table is drawn zoomed. */
export function measureSheetLayout(
  table: HTMLTableElement,
  grid: SheetGrid,
  excelColumnWidths: number[],
  zoom: number
): SheetLayout {
  const scale = zoom > 0 ? zoom : 1;
  const unzoom = (value: number) => value / scale;
  const cols = new Map<number, Span>();
  const headerCells = table.tHead?.rows[0]?.cells;
  grid.columns.forEach((column, position) => {
    // Cell 0 is the corner above the row numbers.
    const cell = headerCells?.[position + 1];
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    cols.set(column.index, {
      start: unzoom(rect.left - tableRect.left),
      size: unzoom(rect.width),
      excelSize: excelColumnWidths[position] ?? unzoom(rect.width),
    });
  });
  const rows = new Map<number, Span>();
  const bodyRows = table.tBodies[0]?.rows;
  grid.rows.forEach((row, position) => {
    const element = bodyRows?.[position];
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    rows.set(row.index, {
      start: unzoom(rect.top - tableRect.top),
      size: unzoom(rect.height),
      excelSize: row.heightPx,
    });
  });
  return {
    cols,
    rows,
    colOrder: grid.columns.map((column) => column.index),
    rowOrder: grid.rows.map((row) => row.index),
  };
}
