import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { SheetGrid } from '@/modules/files/lib/spreadsheet/sheet-grid';
import type { SheetLayout } from '@/modules/files/lib/spreadsheet/sheet-layout';

import { measureSheetLayout } from './measure-sheet-layout';

/** The pixel width Excel gives one width unit at Calibri 11, which drawing offsets are measured in. */
const EXCEL_DIGIT_WIDTH_PX = 7;

/**
 * The table's measured layout, for placing drawings, kept current as the table
 * resizes (fonts arriving, zoom). `null` until first measured, or when the
 * sheet has nothing to place — then nothing is measured at all.
 */
export function useSheetLayout(
  tableRef: RefObject<HTMLTableElement | null>,
  grid: SheetGrid,
  zoom: number,
  enabled: boolean
): SheetLayout | null {
  const [measured, setMeasured] = useState<{ grid: SheetGrid; layout: SheetLayout } | null>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const excelWidths = useMemo(
    () => grid.columns.map((column) => column.width * EXCEL_DIGIT_WIDTH_PX),
    [grid]
  );

  useEffect(() => {
    const table = tableRef.current;
    if (!table || !enabled) return;
    // Fires once on observe, then on every resize — a zoom change resizes the table.
    const observer = new ResizeObserver(() => {
      setMeasured({
        grid,
        layout: measureSheetLayout(table, grid, excelWidths, zoomRef.current / 100),
      });
    });
    observer.observe(table);
    return () => observer.disconnect();
  }, [tableRef, grid, excelWidths, enabled]);

  return enabled && measured?.grid === grid ? measured.layout : null;
}
