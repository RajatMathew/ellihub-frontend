import type { CellStyle } from '@/modules/files/lib/spreadsheet/cell-style';
import { fontFamilyCss, type SheetGrid } from '@/modules/files/lib/spreadsheet/sheet-grid';
import type { PreviewWorkbook } from '@/modules/files/lib/spreadsheet/workbook';

/**
 * Text measurement for the grid, through a canvas: the one part of drawing a
 * sheet that needs the fonts this browser actually has.
 */

/** Calibri 11's widest digit, which Excel's width units are counted in. */
const EXCEL_DIGIT_WIDTH_PX = 7;

/**
 * Room a cell's text loses before it is clipped: the 4px padding it is aligned
 * against and the 1px gridline. `overflow: hidden` clips at the padding box, so
 * the far side's padding still shows text.
 */
const CLIP_INSET_PX = 5;

function canvasFont(style: CellStyle, baseFont: PreviewWorkbook['baseFont']): string {
  const family = fontFamilyCss(style.fontFamily ?? baseFont.family) ?? 'sans-serif';
  const size = style.fontSizePt ?? baseFont.sizePt ?? 11;
  return `${style.italic ? 'italic ' : ''}${style.bold ? '700 ' : ''}${size}pt ${family}`;
}

/**
 * Excel's `###`: a number too wide for its cell is never shown cut short,
 * because `$25,483.0` reads as a different, plausible value. Returns the text
 * each numeric cell should show, keyed by `row:col`, for the ones that overflow.
 */
export function overflowingNumbers(
  grid: SheetGrid,
  columnWidths: number[],
  baseFont: PreviewWorkbook['baseFont']
): Map<string, string> {
  const result = new Map<string, string>();
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = document.createElement('canvas').getContext('2d');
  } catch (error: unknown) {
    console.warn('could not measure spreadsheet numbers', error);
  }
  if (!context) return result;
  const position = new Map(grid.columns.map((column, index) => [column.index, index]));
  for (const row of grid.rows) {
    for (const cell of row.cells) {
      if (!cell.numeric || !cell.text || cell.style.wrap) continue;
      const start = position.get(cell.col)!;
      const available =
        columnWidths.slice(start, start + cell.colSpan).reduce((sum, width) => sum + width, 0) -
        CLIP_INSET_PX;
      context.font = canvasFont(cell.style, baseFont);
      if (context.measureText(cell.text).width <= available) continue;
      const hash = Math.max(1, context.measureText('#').width);
      result.set(`${row.index}:${cell.col}`, '#'.repeat(Math.max(1, Math.floor(available / hash))));
    }
  }
  return result;
}

/**
 * The widest digit of the font the grid is drawn in. Excel sizes columns in
 * digits, so measuring the font this browser actually has keeps a number that
 * fits in Excel from being clipped here when Calibri falls back to a wider face.
 */
export function measureDigitWidth(baseFont: PreviewWorkbook['baseFont']): number {
  try {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return EXCEL_DIGIT_WIDTH_PX;
    context.font = canvasFont({}, baseFont);
    const widest = Math.max(
      ...'0123456789'.split('').map((digit) => context.measureText(digit).width)
    );
    return widest > 0 ? widest : EXCEL_DIGIT_WIDTH_PX;
  } catch (error: unknown) {
    console.warn('could not measure the spreadsheet font', error);
    return EXCEL_DIGIT_WIDTH_PX;
  }
}
