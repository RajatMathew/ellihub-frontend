import { internalSheetTarget, safeHref } from '@/modules/files/lib/file-preview-links';
import type * as ExcelTs from '@cj-tech-master/excelts';

import {
  parseThemeColors,
  resolveColor,
  toCellStyle,
  type BaseFont,
  type CellStyle,
  type StyleLike,
} from './cell-style';
import { formatNumber, formatText } from './cell-text';
import { drawingExtent, parseThemeFonts } from './drawing';
import type * as ExcelTsReader from './excelts';
import { readSheetDrawings, type PackageReader, type SheetDrawing } from './sheet-drawings';
import {
  buildSheetGrid,
  isVisibleStyle,
  MAX_PREVIEW_COLS,
  MAX_PREVIEW_ROWS,
  type CellKind,
  type CellLink,
  type SheetGrid,
  type SheetSource,
  type SourceRange,
  type TextRun,
} from './sheet-grid';

/**
 * Opens a workbook for the preview with ExcelTS and reads each sheet into a
 * `SheetSource`, the plain description `sheet-grid.ts` draws from. Sheets are
 * read one at a time, when their tab is first opened.
 *
 * The ExcelTS module (`./excelts`) is passed in rather than imported, so this
 * file stays out of the bundle until the dialog lazy-loads the library.
 */

type ExcelTsModule = typeof ExcelTsReader;
type Worksheet = ExcelTs.Worksheet;
type Cell = ExcelTs.Cell;

export interface WorkbookSheet {
  name: string;
  tabColor?: string;
  /** Text boxes and pictures floating over the cells. */
  drawing?: SheetDrawing;
  buildGrid: () => SheetGrid;
}

export interface PreviewWorkbook {
  /** Visible sheets only. Hidden and "very hidden" sheets stay hidden, as in Excel. */
  sheets: WorkbookSheet[];
  /** Index into `sheets` of the tab the workbook was saved on. */
  activeIndex: number;
  /** The workbook's default font, which unstyled cells are drawn in. */
  baseFont: BaseFont;
}

function cellKind(xlsx: ExcelTsModule, cell: Cell): CellKind {
  // `effectiveType` is a formula's result type, so `=SUM(…)` aligns as a number.
  switch (cell.effectiveType) {
    case xlsx.ValueType.Number:
    case xlsx.ValueType.Date:
      return 'number';
    case xlsx.ValueType.Boolean:
      return 'boolean';
    case xlsx.ValueType.Error:
      return 'error';
    default:
      return 'text';
  }
}

/**
 * The cell's text as Excel shows it. Numbers, dates and text go through
 * `cell-text.ts`, which fixes what ExcelTS's formatter drops (currency codes,
 * text sections); rich text, links, errors and booleans keep ExcelTS's text.
 */
function displayText(xlsx: ExcelTsModule, cell: Cell): string {
  const value: unknown = cell.value;
  const result =
    value && typeof value === 'object' && 'formula' in value
      ? (value as { result?: unknown }).result
      : value;
  const format = typeof cell.numFmt === 'string' ? cell.numFmt : cell.numFmt?.formatCode;
  if (typeof result === 'number' || result instanceof Date) {
    return formatNumber(result, format, xlsx.formatCellValue);
  }
  if (typeof result === 'string') return formatText(result, format);
  return xlsx.getCellDisplayText(cell);
}

/** A rich-text cell's runs, each with its own font, or `undefined` for plain text. */
function richTextRuns(cell: Cell, themeColors: string[]): TextRun[] | undefined {
  const value: unknown = cell.value;
  if (!value || typeof value !== 'object' || !('richText' in value)) return undefined;
  const runs = (value as { richText?: { text?: string; font?: unknown }[] }).richText;
  if (!Array.isArray(runs) || runs.length === 0) return undefined;
  return runs.map((run) => ({
    text: run.text ?? '',
    // No base font to strip: a run's size and family are its own, not the grid's.
    style: run.font ? toCellStyle({ font: run.font } as StyleLike, themeColors, {}) : undefined,
  }));
}

/** A linked cell's destination, when it is one a reader can safely follow. */
function cellLink(cell: Cell, sheetNames: Set<string>): CellLink | undefined {
  const target = cell.hyperlink;
  if (!target) return undefined;
  const sheet = internalSheetTarget(target);
  if (sheet && sheetNames.has(sheet)) return { kind: 'sheet', sheet };
  const href = safeHref(target);
  return href ? { kind: 'url', href } : undefined;
}

/** Only formatting that would show on a blank cell; a row or column's bare default font is not. */
function meaningfulStyle(style: CellStyle): CellStyle | undefined {
  return isVisibleStyle(style) ? style : undefined;
}

function decodeRange(xlsx: ExcelTsModule, range: string): SourceRange | null {
  try {
    const { s, e } = xlsx.decodeRange(range);
    return { top: s.r, left: s.c, bottom: e.r, right: e.c };
  } catch (error: unknown) {
    console.warn('skipping an unreadable merge range', range, error);
    return null;
  }
}

function readSheet(
  xlsx: ExcelTsModule,
  sheet: Worksheet,
  themeColors: string[],
  baseFont: BaseFont,
  drawing: SheetDrawing | undefined,
  sheetNames: Set<string>
): SheetSource {
  const style = (value: unknown) => toCellStyle(value as StyleLike, themeColors, baseFont);
  const source: SheetSource = {
    cells: new Map(),
    rowStyles: new Map(),
    colStyles: new Map(),
    merges: [],
    colWidths: new Map(),
    rowHeights: new Map(),
    hiddenRows: new Set(),
    hiddenCols: new Set(),
    defaultColWidth: sheet.properties.defaultColWidth,
    defaultRowHeight: sheet.properties.defaultRowHeight,
    showGridLines: sheet.views?.[0]?.showGridLines !== false,
  };
  let extentRows = 0;
  let extentCols = 0;

  // `includeEmpty` is what reaches formatted blanks: a colored band, a ruled
  // total line. Cells past the preview caps only count toward the extent.
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const r = rowNumber - 1;
    if (row.hidden) source.hiddenRows.add(r);
    if (row.height) source.rowHeights.set(r, row.height);
    const rowStyle = r < MAX_PREVIEW_ROWS ? meaningfulStyle(style(row.style)) : undefined;
    if (rowStyle) source.rowStyles.set(r, rowStyle);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const c = colNumber - 1;
      // A cell under a merge shows nothing, but its borders are the merge's outline.
      const covered = cell.type === xlsx.ValueType.Merge;
      const text = covered ? '' : displayText(xlsx, cell);
      const cellStyle = style(cell.style);
      if (text || isVisibleStyle(cellStyle)) {
        extentRows = Math.max(extentRows, r + 1);
        extentCols = Math.max(extentCols, c + 1);
      }
      if (r >= MAX_PREVIEW_ROWS || c >= MAX_PREVIEW_COLS) return;
      source.cells.set(`${r}:${c}`, {
        text,
        kind: covered ? 'text' : cellKind(xlsx, cell),
        style: cellStyle,
        runs: covered ? undefined : richTextRuns(cell, themeColors),
        link: covered ? undefined : cellLink(cell, sheetNames),
      });
    });
  });
  // Drawings count toward the used range: a cover block of text boxes above
  // the first table is still part of the sheet.
  const drawn = drawing ? drawingExtent(drawing.items) : { rows: 0, cols: 0 };
  source.extent = {
    rows: Math.max(extentRows, drawn.rows),
    cols: Math.max(extentCols, drawn.cols),
  };

  // `columnCount` stops at the last cell; a column the file formats past it
  // (a shaded column with nothing typed in it) is in `columns`.
  const columnCount = Math.min(
    Math.max(sheet.columnCount, sheet.columns?.length ?? 0),
    MAX_PREVIEW_COLS
  );
  for (let c = 0; c < columnCount; c += 1) {
    const column = sheet.getColumn(c + 1);
    if (column.hidden) source.hiddenCols.add(c);
    if (column.width) source.colWidths.set(c, column.width);
    const colStyle = meaningfulStyle(style(column.style));
    if (colStyle) source.colStyles.set(c, colStyle);
  }

  for (const range of sheet.model.mergeCells ?? []) {
    const merge = decodeRange(xlsx, range);
    if (merge) source.merges.push(merge);
  }
  return source;
}

/** Each sheet's drawing layer. A drawing that cannot be read is skipped; the cells still preview. */
async function readDrawings(
  xlsx: ExcelTsModule,
  data: ArrayBuffer,
  theme: Parameters<typeof readSheetDrawings>[1]
): Promise<Map<string, SheetDrawing>> {
  try {
    const zip = xlsx.unzip(new Uint8Array(data));
    const decoder = new TextDecoder();
    const pkg: PackageReader = {
      bytes: async (path) => (await zip.bytes(path)) ?? undefined,
      text: async (path) => {
        const bytes = await zip.bytes(path);
        return bytes ? decoder.decode(bytes) : undefined;
      },
    };
    return await readSheetDrawings(pkg, theme);
  } catch (error: unknown) {
    console.warn('spreadsheet drawings could not be read', error);
    return new Map();
  }
}

export async function readWorkbook(
  xlsx: ExcelTsModule,
  data: ArrayBuffer
): Promise<PreviewWorkbook> {
  const workbook = new xlsx.Workbook();
  await workbook.xlsx.load(data);

  const themes = workbook.model.themes as Record<string, unknown> | undefined;
  const themeColors = parseThemeColors(themes?.theme1);
  const font = workbook.defaultFont;
  const baseFont: BaseFont = { family: font?.name, sizePt: font?.size };
  const savedTab = workbook.views?.[0]?.activeTab ?? 0;
  const drawings = await readDrawings(xlsx, data, {
    colors: themeColors,
    ...parseThemeFonts(themes?.theme1),
  });

  const sheets: WorkbookSheet[] = [];
  let activeIndex = 0;
  // Links to a hidden sheet stay plain text: its tab is not shown.
  const visibleNames = new Set(
    workbook.worksheets
      .filter((sheet) => sheet.state !== 'hidden' && sheet.state !== 'veryHidden')
      .map((sheet) => sheet.name)
  );
  workbook.worksheets.forEach((sheet, index) => {
    if (sheet.state === 'hidden' || sheet.state === 'veryHidden') return;
    if (index === savedTab) activeIndex = sheets.length;
    let grid: SheetGrid | undefined;
    const drawing = drawings.get(sheet.name);
    sheets.push({
      name: sheet.name,
      drawing,
      tabColor: resolveColor(sheet.properties.tabColor, themeColors),
      // Read the first time the tab opens, then kept, so switching back is instant.
      buildGrid: () =>
        (grid ??= buildSheetGrid(
          readSheet(xlsx, sheet, themeColors, baseFont, drawing, visibleNames)
        )),
    });
  });

  return { sheets, activeIndex, baseFont };
}
