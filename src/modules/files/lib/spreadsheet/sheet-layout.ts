import type { CellPoint, DrawingAnchor } from './drawing';

/**
 * Where the grid's rows and columns actually landed, measured from the
 * rendered table, so drawings anchored to cells sit on those cells — even when
 * this browser's font made the columns wider than Excel's, or a row grew.
 * Positions are in the table's own pixels at 100% zoom.
 */
export interface SheetLayout {
  cols: Map<number, Span>;
  rows: Map<number, Span>;
  /** Visible column / row indexes, ascending. */
  colOrder: number[];
  rowOrder: number[];
}

export interface Span {
  start: number;
  size: number;
  /** The size Excel drew it at, which a drawing's offsets into it are measured against. */
  excelSize: number;
}

export interface DrawingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The edge at `index` plus an offset into it. A hidden or capped-off index
 * collapses onto the next one drawn, as a hidden column does in Excel.
 * `undefined` when the point lies past everything drawn.
 */
function edge(
  spans: Map<number, Span>,
  order: number[],
  index: number,
  offsetPx: number
): number | undefined {
  const span = spans.get(index);
  if (span) {
    // The offset was measured in Excel's size of the span; stretch it to ours.
    const ratio = span.excelSize > 0 ? span.size / span.excelSize : 1;
    return span.start + Math.min(offsetPx * ratio, span.size);
  }
  const next = order.find((candidate) => candidate > index);
  if (next != null) return spans.get(next)?.start;
  const last = spans.get(order[order.length - 1] ?? -1);
  return last && index === (order[order.length - 1] ?? -1) + 1 ? last.start + last.size : undefined;
}

function point(layout: SheetLayout, at: CellPoint): { x: number; y: number } | undefined {
  const x = edge(layout.cols, layout.colOrder, at.col, at.colOffPx);
  const y = edge(layout.rows, layout.rowOrder, at.row, at.rowOffPx);
  return x == null || y == null ? undefined : { x, y };
}

/** A drawing's box on the grid, or `undefined` when it starts past what the preview drew. */
export function anchorBox(layout: SheetLayout, anchor: DrawingAnchor): DrawingBox | undefined {
  const start = point(layout, anchor.from);
  if (!start) return undefined;
  let width: number;
  let height: number;
  if (anchor.to) {
    // An end past the drawn area is clamped to it, so the drawing is cut, not lost.
    const end = point(layout, anchor.to) ?? lastCorner(layout);
    width = Math.max(0, end.x - start.x);
    height = Math.max(0, end.y - start.y);
  } else {
    width = anchor.sizePx?.width ?? 0;
    height = anchor.sizePx?.height ?? 0;
  }
  const frame = anchor.frame ?? { left: 0, top: 0, width: 1, height: 1 };
  return {
    left: start.x + frame.left * width,
    top: start.y + frame.top * height,
    width: frame.width * width,
    height: frame.height * height,
  };
}

function lastCorner(layout: SheetLayout): { x: number; y: number } {
  const col = layout.cols.get(layout.colOrder[layout.colOrder.length - 1] ?? -1);
  const row = layout.rows.get(layout.rowOrder[layout.rowOrder.length - 1] ?? -1);
  return { x: col ? col.start + col.size : 0, y: row ? row.start + row.size : 0 };
}
