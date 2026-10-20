import type { CSSProperties } from 'react';

import { fontStack, type BorderEdge, type CellStyle } from './cell-style';

/**
 * A sheet as the preview draws it: the visible rows and columns from A1 to the
 * last cell with content, each cell with its display text and resolved style.
 * Built from a `SheetSource` — a plain description of the sheet that
 * `workbook.ts` reads out of ExcelTS — and kept free of React and of the
 * library, so it can be unit tested with sheets written by hand.
 */

/** Past these the grid stops; the rest of the sheet is a download away. */
export const MAX_PREVIEW_ROWS = 1000;
export const MAX_PREVIEW_COLS = 50;

/**
 * A sheet with nothing in it is still drawn as a sheet — blank columns A–Z
 * under their letters, as Excel and Google Sheets open a new one — rather
 * than a message.
 */
export const BLANK_SHEET_ROWS = 100;
export const BLANK_SHEET_COLS = 26;

/**
 * Excel's default column: 8.43 characters plus 5px of padding, which at
 * Calibri 11's 7px digit is the familiar 64px — in width units, 9.14.
 */
const DEFAULT_COL_WIDTH = 8.43 + 5 / 7;
/** Excel's default row height, in points. */
const DEFAULT_ROW_HEIGHT_PT = 15;
const PX_PER_PT = 4 / 3;

export type CellKind = 'text' | 'number' | 'boolean' | 'error';

/** One run of a rich-text cell, such as a red bold "Web:" before a plain address. */
export interface TextRun {
  text: string;
  /**
   * The run's own font. Excel gives a run with a font all of its properties —
   * what it does not set is off, not inherited — so a run is drawn with
   * exactly this. `undefined` means the run uses the cell's font.
   */
  style?: CellStyle;
}

/**
 * Where a linked cell goes: a page outside (already checked by `safeHref`) or
 * another sheet of this workbook, which the preview opens as a tab.
 */
export type CellLink = { kind: 'url'; href: string } | { kind: 'sheet'; sheet: string };

export interface SourceCell {
  /** The value as Excel displays it, number format applied. */
  text: string;
  kind: CellKind;
  style: CellStyle;
  runs?: TextRun[];
  link?: CellLink;
}

/** 0-based, inclusive. */
export interface SourceRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** A sheet as read from the file. Every index is 0-based. */
export interface SheetSource {
  /** Cells the file lists — values and formatted blanks — keyed `row:col`. */
  cells: Map<string, SourceCell>;
  /** Formatting for a row's or column's unlisted cells. A row's wins, as in Excel. */
  rowStyles: Map<number, CellStyle>;
  colStyles: Map<number, CellStyle>;
  merges: SourceRange[];
  /** In Excel width units (see `GridColumn.width`). */
  colWidths: Map<number, number>;
  /** In points. */
  rowHeights: Map<number, number>;
  hiddenRows: Set<number>;
  hiddenCols: Set<number>;
  defaultColWidth?: number;
  defaultRowHeight?: number;
  showGridLines: boolean;
  /**
   * How far the content reaches, when `cells` was cut short to save memory —
   * so the grid can still say the sheet goes on.
   */
  extent?: { rows: number; cols: number };
}

export interface GridColumn {
  index: number;
  label: string;
  /**
   * In Excel's width units: multiples of the widest digit of the workbook's
   * base font, padding included. The view turns it into pixels with the digit
   * width of the font it actually renders, so a machine without Calibri gets
   * columns wide enough for its fallback font instead of clipped numbers.
   */
  width: number;
}

export interface GridCell {
  col: number;
  text: string;
  runs?: TextRun[];
  link?: CellLink;
  style: CellStyle;
  /** A number or date. Excel never cuts one short: one that does not fit shows `###`. */
  numeric: boolean;
  /** Numbers and dates sit right, booleans and errors center, under Excel's "General" alignment. */
  align: 'left' | 'center' | 'right' | 'justify';
  colSpan: number;
  rowSpan: number;
  /**
   * Text that may spill into the empty cell to its right, as Excel draws it.
   * Clipped when the neighbour has content.
   */
  overflow: boolean;
  /** The borders this cell draws — see `resolveEdges`. */
  edges: CellEdges;
}

/**
 * Each cell draws its right and bottom edge; top and left are drawn by the
 * neighbour above / to the left, except along the sheet's first row and
 * column. One owner per edge is what lets a cell's border replace the gridline
 * it sits on. Two owners would draw both: a doubled line with separated table
 * borders, and with `border-collapse` a same-width tie goes to the cell
 * further up or left, so the gray gridline would hide a black rule.
 */
export type CellEdges = Partial<Record<'top' | 'right' | 'bottom' | 'left', BorderEdge>>;

export interface GridRow {
  index: number;
  heightPx: number;
  /** Cells hidden under a merge are left out; the merge's first cell spans them. */
  cells: GridCell[];
}

export interface SheetGrid {
  columns: GridColumn[];
  rows: GridRow[];
  showGridLines: boolean;
  /** The used range before the preview caps were applied. */
  totalRows: number;
  totalCols: number;
  truncated: boolean;
}

export function columnLabel(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return label;
}

const GENERAL_ALIGN: Record<CellKind, GridCell['align']> = {
  text: 'left',
  number: 'right',
  boolean: 'center',
  error: 'center',
};

/** A style worth drawing on an otherwise empty cell — a colored band, a ruled total line. */
export function isVisibleStyle(style: CellStyle | undefined): boolean {
  return !!style && (!!style.fill || !!style.borders);
}

export function buildSheetGrid(source: SheetSource): SheetGrid {
  const { cells, merges } = source;
  const styleAt = (row: number, col: number): CellStyle =>
    cells.get(`${row}:${col}`)?.style ??
    source.rowStyles.get(row) ??
    source.colStyles.get(col) ??
    {};

  // The used range: the last cell with a value or a visible format. A file's
  // own dimension is often far larger (a column formatted to row 1,048,576).
  let lastRow = (source.extent?.rows ?? 0) - 1;
  let lastCol = (source.extent?.cols ?? 0) - 1;
  const extend = (row: number, col: number) => {
    lastRow = Math.max(lastRow, row);
    lastCol = Math.max(lastCol, col);
  };
  for (const [key, cell] of cells) {
    if (!cell.text && !isVisibleStyle(cell.style)) continue;
    const [row, col] = key.split(':').map(Number) as [number, number];
    extend(row, col);
  }
  for (const merge of merges) extend(merge.bottom, merge.right);
  // A formatted row or column shows in Excel with nothing in it, so it counts too.
  for (const row of source.rowStyles.keys()) lastRow = Math.max(lastRow, row);
  for (const col of source.colStyles.keys()) lastCol = Math.max(lastCol, col);

  const totalRows = lastRow + 1;
  const totalCols = lastCol + 1;
  const rowLimit = totalRows > 0 ? Math.min(totalRows, MAX_PREVIEW_ROWS) : BLANK_SHEET_ROWS;
  const colLimit = totalCols > 0 ? Math.min(totalCols, MAX_PREVIEW_COLS) : BLANK_SHEET_COLS;

  const columns: GridColumn[] = [];
  for (let col = 0; col < colLimit; col += 1) {
    if (source.hiddenCols.has(col)) continue;
    const width = source.colWidths.get(col) ?? source.defaultColWidth ?? DEFAULT_COL_WIDTH;
    columns.push({ index: col, label: columnLabel(col), width: Math.max(width, 0.1) });
  }
  const visibleCols = new Set(columns.map((column) => column.index));

  // Merges: the first cell spans the visible rows and columns it covers.
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  const mergeEnds = new Map<string, { row: number; col: number }>();
  const covered = new Set<string>();
  for (const { top, left, bottom, right } of merges) {
    if (top >= rowLimit || left >= colLimit) continue;
    let rowSpan = 0;
    let colSpan = 0;
    for (let row = top; row <= Math.min(bottom, rowLimit - 1); row += 1) {
      if (!source.hiddenRows.has(row)) rowSpan += 1;
    }
    for (let col = left; col <= Math.min(right, colLimit - 1); col += 1) {
      if (visibleCols.has(col)) colSpan += 1;
    }
    spans.set(`${top}:${left}`, { rowSpan: Math.max(rowSpan, 1), colSpan: Math.max(colSpan, 1) });
    mergeEnds.set(`${top}:${left}`, { row: bottom, col: right });
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (row !== top || col !== left) covered.add(`${row}:${col}`);
      }
    }
  }

  const rows: GridRow[] = [];
  for (let row = 0; row < rowLimit; row += 1) {
    if (source.hiddenRows.has(row)) continue;
    const gridCells: GridCell[] = [];
    const texts = columns.map((column) => cells.get(`${row}:${column.index}`)?.text ?? '');
    columns.forEach((column, position) => {
      const key = `${row}:${column.index}`;
      if (covered.has(key)) return;
      const source = cells.get(key);
      const kind = source?.kind ?? 'text';
      const merge = mergeEnds.get(key);
      const style = merge
        ? mergedStyle(styleAt, row, column.index, merge)
        : styleAt(row, column.index);
      const align = style.horizontal ?? GENERAL_ALIGN[kind];
      const span = spans.get(key);
      const next = columns[position + 1];
      const nextIsFree = !!next && !texts[position + 1] && !covered.has(`${row}:${next.index}`);
      gridCells.push({
        col: column.index,
        text: texts[position]!,
        runs: source?.runs,
        link: source?.link,
        numeric: kind === 'number',
        style,
        align,
        colSpan: span?.colSpan ?? 1,
        rowSpan: span?.rowSpan ?? 1,
        overflow: !span && !style.wrap && align === 'left' && nextIsFree,
        edges: {},
      });
    });
    const heightPt = source.rowHeights.get(row) ?? source.defaultRowHeight ?? DEFAULT_ROW_HEIGHT_PT;
    rows.push({ index: row, heightPx: Math.round(heightPt * PX_PER_PT), cells: gridCells });
  }
  resolveEdges(rows, columns, styleAt);

  return {
    columns,
    rows,
    showGridLines: source.showGridLines,
    totalRows,
    totalCols,
    truncated: totalRows > rowLimit || totalCols > colLimit,
  };
}

/**
 * The top-left corner of a grid, `maxRows` drawn rows by `maxCols` drawn
 * columns — for a thumbnail, which shows a dozen rows but would otherwise lay
 * out up to `MAX_PREVIEW_ROWS` × `MAX_PREVIEW_COLS` live cells. That many
 * elements inside an attachment card made ticking the card stall, because the
 * card's hover and focus styles re-style everything under it.
 *
 * Counts drawn rows and columns, so hidden ones never use up the budget. A
 * merge that runs past the edge is cut at it. `truncated` keeps the sheet's
 * own answer: the corner is a picture, not a claim about the file.
 */
export function cropSheetGrid(grid: SheetGrid, maxRows: number, maxCols: number): SheetGrid {
  if (grid.rows.length <= maxRows && grid.columns.length <= maxCols) return grid;
  const columns = grid.columns.slice(0, maxCols);
  const columnPosition = new Map(columns.map((column, position) => [column.index, position]));
  const rows = grid.rows.slice(0, maxRows).map((row, rowPosition) => ({
    ...row,
    cells: row.cells.flatMap((cell) => {
      const colPosition = columnPosition.get(cell.col);
      if (colPosition === undefined) return [];
      return [
        {
          ...cell,
          colSpan: Math.min(cell.colSpan, columns.length - colPosition),
          rowSpan: Math.min(cell.rowSpan, maxRows - rowPosition),
        },
      ];
    }),
  }));
  return { ...grid, columns, rows };
}

/**
 * A merged cell's style. Excel stores a merge's outline on the cells along each
 * edge — the right border on the right-hand cells, the bottom on the bottom
 * ones — so the first cell alone has only its top and left.
 */
function mergedStyle(
  styleAt: (row: number, col: number) => CellStyle,
  row: number,
  col: number,
  end: { row: number; col: number }
): CellStyle {
  const style = styleAt(row, col);
  const right = styleAt(row, end.col).borders?.right;
  const bottom = styleAt(end.row, col).borders?.bottom;
  if (!right && !bottom) return style;
  return { ...style, borders: { ...style.borders, right, bottom } };
}

const LINE_WEIGHT: Record<BorderEdge['line'], number> = {
  dotted: 0,
  dashed: 1,
  solid: 2,
  double: 3,
};

/** Excel draws the heavier of two borders that meet on one edge. */
function heavier(a: BorderEdge | undefined, b: BorderEdge | undefined): BorderEdge | undefined {
  if (!a || !b) return a ?? b;
  if (a.widthPx !== b.widthPx) return a.widthPx > b.widthPx ? a : b;
  return LINE_WEIGHT[a.line] >= LINE_WEIGHT[b.line] ? a : b;
}

/**
 * The neighbour's border is read from the file's style at that position, not
 * from the drawn cell there: under a merge there is no drawn cell, but the
 * covered cells still carry the merge's outline (a top rule over E2 inside
 * D2:F2 lives on E2).
 */
function resolveEdges(
  rows: GridRow[],
  columns: GridColumn[],
  styleAt: (row: number, col: number) => CellStyle
): void {
  const columnPosition = new Map(columns.map((column, position) => [column.index, position]));
  rows.forEach((row, rowPosition) => {
    for (const cell of row.cells) {
      const colPosition = columnPosition.get(cell.col)!;
      const own = cell.style.borders ?? {};
      const rightCol = columns[colPosition + cell.colSpan]?.index;
      const belowRow = rows[rowPosition + cell.rowSpan]?.index;
      const right = rightCol == null ? undefined : styleAt(row.index, rightCol).borders?.left;
      const below = belowRow == null ? undefined : styleAt(belowRow, cell.col).borders?.top;
      const edges: CellEdges = {
        right: heavier(own.right, right),
        bottom: heavier(own.bottom, below),
      };
      if (rowPosition === 0) edges.top = own.top;
      if (colPosition === 0) edges.left = own.left;
      cell.edges = edges;
    }
  });
}

export function fontFamilyCss(family: string | undefined): string | undefined {
  return fontStack(family);
}

/**
 * The cell's formatting as inline CSS. These colors and sizes are the
 * workbook's own data, not app theme values, so they cannot be tokens.
 */
/**
 * A rich-text run's font. A run that sets a font sets all of it — Excel draws
 * what it leaves out as off and black, not as the cell's — so every property
 * is written, including the "off" ones.
 */
export function runCss(style: CellStyle): CSSProperties {
  const decorations = [style.underline && 'underline', style.strike && 'line-through'];
  return {
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: decorations.filter(Boolean).join(' ') || 'none',
    color: style.color ?? 'var(--sheet-ink)',
    fontSize: style.fontSizePt ? `${style.fontSizePt}pt` : undefined,
    fontFamily: fontStack(style.fontFamily),
  };
}

export function cellCss(cell: GridCell): CSSProperties {
  const { style } = cell;
  const css: CSSProperties = { textAlign: cell.align };
  if (style.bold) css.fontWeight = 700;
  if (style.italic) css.fontStyle = 'italic';
  const decorations = [style.underline && 'underline', style.strike && 'line-through'];
  const textDecoration = decorations.filter(Boolean).join(' ');
  if (textDecoration) css.textDecoration = textDecoration;
  if (style.color) css.color = style.color;
  if (style.fontSizePt) css.fontSize = `${style.fontSizePt}pt`;
  if (style.fontFamily) css.fontFamily = fontFamilyCss(style.fontFamily);
  if (style.fill) css.backgroundColor = style.fill;
  css.verticalAlign = style.vertical ?? 'bottom';
  if (style.wrap) css.whiteSpace = 'pre-wrap';
  if (style.indent) css.paddingLeft = `${style.indent * 9 + 3}px`;
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const edge = cell.edges[side];
    const name = side[0]!.toUpperCase() + side.slice(1);
    if (edge) {
      css[`border${name}` as 'borderTop'] =
        `${edge.widthPx}px ${edge.line} ${edge.color ?? 'var(--sheet-ink)'}`;
    } else if (style.fill && (side === 'right' || side === 'bottom')) {
      // A filled cell hides the gridlines it draws, as in Excel.
      css[`border${name}Color` as 'borderTopColor'] = style.fill;
    }
  }
  return css;
}
