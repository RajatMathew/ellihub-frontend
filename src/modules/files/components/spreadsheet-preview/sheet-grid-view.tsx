import { useMemo, useRef, type CSSProperties } from 'react';

import { usePreviewZoomGestures } from '@/modules/files/hooks/use-preview-zoom-gestures';
import { useSettledZoom } from '@/modules/files/hooks/use-settled-zoom';
import { zoomBoxStyle } from '@/modules/files/lib/preview-zoom';
import {
  cropSheetGrid,
  fontFamilyCss,
  MAX_PREVIEW_COLS,
  MAX_PREVIEW_ROWS,
  type SheetGrid,
} from '@/modules/files/lib/spreadsheet/sheet-grid';
import type { PreviewWorkbook, WorkbookSheet } from '@/modules/files/lib/spreadsheet/workbook';

import { SheetDrawingLayer } from './sheet-drawing-layer';
import { ROW_HEADER_WIDTH_PX, SheetTable } from './sheet-table';
import { measureDigitWidth, overflowingNumbers } from './sheet-text-metrics';
import { useSheetLayout } from './use-sheet-layout';

function TruncationNotice({ grid }: { grid: SheetGrid }) {
  if (!grid.truncated) return null;
  const rows = Math.min(grid.totalRows, MAX_PREVIEW_ROWS).toLocaleString();
  const cols = Math.min(grid.totalCols, MAX_PREVIEW_COLS).toLocaleString();
  return (
    <p className="shrink-0 border-b border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground">
      Showing the first {rows} rows and {cols} columns. Download the file to see the rest.
    </p>
  );
}

/**
 * One sheet drawn as Excel draws it: column letters across the top, row
 * numbers down the side, and every cell with the workbook's own fills, fonts,
 * alignment and borders. Read-only — there is no selection or editing.
 *
 * `zoom` scales the whole table with CSS `zoom`, as Excel scales the sheet:
 * widths, fonts and borders together, so the `###` checks stay correct. While
 * a pinch or scroll is still moving it scales with a transform instead — see
 * `zoomBoxStyle`.
 */
export function SheetGridView({
  sheet,
  baseFont,
  zoom,
  onZoomChange,
  onOpenSheet,
  maxRows,
  maxCols,
}: {
  sheet: WorkbookSheet;
  baseFont: PreviewWorkbook['baseFont'];
  zoom: number;
  onZoomChange: (update: (zoom: number) => number) => void;
  /** Follows a cell's link to another sheet of the workbook. */
  onOpenSheet: (sheet: string) => void;
  /** Draw only the top-left corner — see `cropSheetGrid`. */
  maxRows?: number;
  maxCols?: number;
}) {
  const grid = useMemo(() => {
    const full = sheet.buildGrid();
    return maxRows || maxCols
      ? cropSheetGrid(full, maxRows ?? full.rows.length, maxCols ?? full.columns.length)
      : full;
  }, [sheet, maxRows, maxCols]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  usePreviewZoomGestures(scrollRef, zoom, onZoomChange, grid);
  // Layout follows the settled zoom; in between, `zoomBoxStyle` scales with a transform.
  const settledZoom = useSettledZoom(zoom);
  const layout = useSheetLayout(tableRef, grid, settledZoom, !!sheet.drawing);
  const digitWidth = useMemo(() => measureDigitWidth(baseFont), [baseFont]);
  const columnWidths = useMemo(
    () => grid.columns.map((column) => Math.max(1, Math.round(column.width * digitWidth))),
    [grid, digitWidth]
  );
  const hashed = useMemo(
    () => overflowingNumbers(grid, columnWidths, baseFont),
    [grid, columnWidths, baseFont]
  );
  // The workbook's sizes and base font, which are file data rather than theme values.
  // Memoized so the memoized table skips zoom steps.
  const tableStyle = useMemo<CSSProperties>(
    () => ({
      width: ROW_HEADER_WIDTH_PX + columnWidths.reduce((sum, width) => sum + width, 0),
      fontFamily: fontFamilyCss(baseFont.family),
      fontSize: baseFont.sizePt ? `${baseFont.sizePt}pt` : undefined,
    }),
    [columnWidths, baseFont]
  );

  if (grid.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        This sheet is empty.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TruncationNotice grid={grid} />
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto bg-sheet-canvas"
      >
        {/* The table and its drawings share one zoomed box, so they scale together. */}
        <div className="relative w-max" style={zoomBoxStyle(zoom, settledZoom)}>
          <SheetTable
            ref={tableRef}
            grid={grid}
            columnWidths={columnWidths}
            hashed={hashed}
            style={tableStyle}
            onOpenSheet={onOpenSheet}
          />
          {sheet.drawing && layout && <SheetDrawingLayer drawing={sheet.drawing} layout={layout} />}
        </div>
      </div>
    </div>
  );
}
