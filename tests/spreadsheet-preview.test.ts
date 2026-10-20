// The same ExcelTS surface the dialog loads, zip reader included.

import { describe, expect, test } from 'bun:test';

import { isWorkbookPreviewable } from '../src/modules/files/lib/file-preview-spreadsheet';
import {
  clampZoom,
  pinchZoom,
  sliderToZoom,
  stepZoom,
  touchDistance,
  wheelZoom,
  zoomToSlider,
} from '../src/modules/files/lib/preview-zoom';
import {
  applyTint,
  parseThemeColors,
  resolveColor,
  toCellStyle,
  type CellStyle,
} from '../src/modules/files/lib/spreadsheet/cell-style';
import * as ExcelTs from '../src/modules/files/lib/spreadsheet/excelts';
import {
  BLANK_SHEET_COLS,
  BLANK_SHEET_ROWS,
  buildSheetGrid,
  cellCss,
  columnLabel,
  cropSheetGrid,
  MAX_PREVIEW_ROWS,
  type SheetSource,
  type SourceCell,
} from '../src/modules/files/lib/spreadsheet/sheet-grid';
import { readWorkbook } from '../src/modules/files/lib/spreadsheet/workbook';

const OFFICE_THEME = parseThemeColors(undefined);
const BASE_FONT = { family: 'Calibri', sizePt: 11 };

describe('cell styles', () => {
  test('reads bold and a theme-colored solid fill for a header row', () => {
    const style = toCellStyle(
      {
        font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { theme: 4 } },
      },
      OFFICE_THEME,
      BASE_FONT
    );
    // The base font is the grid's, so it is not repeated on the cell.
    expect(style).toEqual({ bold: true, color: '#ffffff', fill: '#4472c4' });
  });

  test('reads italic, underline, strike, size, family, alignment and indent', () => {
    expect(
      toCellStyle(
        {
          font: { name: 'Georgia', size: 14, italic: true, underline: 'single', strike: true },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true, indent: 2 },
        },
        OFFICE_THEME,
        BASE_FONT
      )
    ).toEqual({
      italic: true,
      underline: true,
      strike: true,
      fontSizePt: 14,
      fontFamily: 'Georgia',
      horizontal: 'center',
      vertical: 'middle',
      wrap: true,
      indent: 2,
    });
  });

  test('`underline: "none"` is not underlined', () => {
    expect(toCellStyle({ font: { underline: 'none' } }, OFFICE_THEME, BASE_FONT)).toEqual({});
  });

  test('applies a theme tint, as Excel’s lighter accent shades do', () => {
    const style = toCellStyle(
      { fill: { type: 'pattern', pattern: 'solid', fgColor: { theme: 4, tint: 0.8 } } },
      OFFICE_THEME,
      BASE_FONT
    );
    // Accent 1, "Lighter 80%" in Excel's picker.
    expect(style.fill).toBe('#dae3f3');
  });

  test('the reserved gray125 fill, and a pattern-less fill, paint nothing', () => {
    for (const fill of [{ type: 'pattern', pattern: 'gray125' }, { type: 'pattern' }]) {
      expect(toCellStyle({ fill }, OFFICE_THEME, BASE_FONT).fill).toBeUndefined();
    }
  });

  test('reads border weights, lines and colors', () => {
    expect(
      toCellStyle(
        {
          border: {
            top: { style: 'thin' },
            bottom: { style: 'double', color: { argb: 'FF1F4E78' } },
            left: { style: 'mediumDashed', color: { indexed: 10 } },
          },
        },
        OFFICE_THEME,
        BASE_FONT
      ).borders
    ).toEqual({
      top: { widthPx: 1, line: 'solid', color: undefined },
      bottom: { widthPx: 3, line: 'double', color: '#1f4e78' },
      left: { widthPx: 2, line: 'dashed', color: '#ff0000' },
    });
  });

  test('theme slots 0 and 1 are light and dark, though the theme part lists dark first', () => {
    const colors = parseThemeColors(`<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:clrScheme name="x">
  <a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>
  <a:lt1><a:sysClr val="window" lastClr="EEEEEE"/></a:lt1>
  <a:dk2><a:srgbClr val="222222"/></a:dk2><a:lt2><a:srgbClr val="DDDDDD"/></a:lt2>
  <a:accent1><a:srgbClr val="C00000"/></a:accent1>
</a:clrScheme></a:themeElements></a:theme>`);
    expect(colors.slice(0, 5)).toEqual(['EEEEEE', '111111', 'DDDDDD', '222222', 'C00000']);
    // Slots the theme leaves out fall back to Office's.
    expect(colors[5]).toBe('ED7D31');
  });

  test('an unreadable theme falls back to Office’s colors', () => {
    expect(parseThemeColors('<a:theme')).toEqual(OFFICE_THEME);
  });

  test('a negative tint darkens', () => {
    expect(applyTint('FFFFFF', -0.5)).toBe('#808080');
    expect(applyTint('4472C4', 0)).toBe('#4472c4');
  });

  test('drops the alpha byte ExcelTS reports as 00 on opaque colors', () => {
    expect(resolveColor({ argb: '00FFFF00' }, OFFICE_THEME)).toBe('#ffff00');
    expect(resolveColor(undefined, OFFICE_THEME)).toBeUndefined();
  });
});

function cell(text: string, kind: SourceCell['kind'] = 'text', style: CellStyle = {}): SourceCell {
  return { text, kind, style };
}

/** A sheet from `A1`-style addresses, for tests. */
function source(cells: Record<string, SourceCell>, extra: Partial<SheetSource> = {}): SheetSource {
  const map = new Map<string, SourceCell>();
  for (const [address, value] of Object.entries(cells)) {
    const match = /^([A-Z]+)(\d+)$/.exec(address)!;
    const col = [...match[1]!].reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) - 1;
    map.set(`${Number(match[2]) - 1}:${col}`, value);
  }
  return {
    cells: map,
    rowStyles: new Map(),
    colStyles: new Map(),
    merges: [],
    colWidths: new Map(),
    rowHeights: new Map(),
    hiddenRows: new Set(),
    hiddenCols: new Set(),
    showGridLines: true,
    ...extra,
  };
}

describe('sheet grid', () => {
  test('measures the used range from content', () => {
    const grid = buildSheetGrid(source({ A1: cell('Item'), C2: cell('3', 'number') }));
    expect(grid.columns.map((column) => column.label)).toEqual(['A', 'B', 'C']);
    expect(grid.rows.map((row) => row.index)).toEqual([0, 1]);
  });

  test('a colored row with no values is still part of the sheet', () => {
    const grid = buildSheetGrid(
      source({ A1: cell('x'), A4: cell('', 'text', { fill: '#ffff00' }) })
    );
    expect(grid.totalRows).toBe(4);
    expect(grid.rows[3]?.cells[0]?.style.fill).toBe('#ffff00');
  });

  test('a formatted row or column with nothing in it is still drawn, as Excel draws it', () => {
    const grid = buildSheetGrid(
      source(
        { A1: cell('x') },
        {
          rowStyles: new Map([[6, { fill: '#00ff00' }]]),
          colStyles: new Map([[4, { fill: '#0000ff' }]]),
        }
      )
    );
    expect(grid.totalRows).toBe(7);
    expect(grid.columns.map((column) => column.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(grid.rows[6]?.cells.every((c) => c.style.fill === '#00ff00')).toBe(true);
    expect(grid.rows[0]?.cells[4]?.style.fill).toBe('#0000ff');
  });

  test('an unlisted cell takes its row’s formatting, then its column’s', () => {
    const grid = buildSheetGrid(
      source(
        { C3: cell('x') },
        {
          rowStyles: new Map([[1, { fill: '#00ff00' }]]),
          colStyles: new Map([[0, { fill: '#0000ff' }]]),
        }
      )
    );
    expect(grid.rows[1]?.cells.map((c) => c.style.fill)).toEqual(['#00ff00', '#00ff00', '#00ff00']);
    expect(grid.rows[0]?.cells.map((c) => c.style.fill)).toEqual(['#0000ff', undefined, undefined]);
  });

  test('numbers sit right under General alignment, booleans center, text left; an explicit alignment wins', () => {
    const grid = buildSheetGrid(
      source({
        A1: cell('Concrete'),
        B1: cell('$1,450.50', 'number'),
        C1: cell('1', 'number', { horizontal: 'center' }),
        D1: cell('TRUE', 'boolean'),
        E1: cell('#DIV/0!', 'error'),
      })
    );
    expect(grid.rows[0]?.cells.map((c) => [c.text, c.align, c.numeric])).toEqual([
      ['Concrete', 'left', false],
      ['$1,450.50', 'right', true],
      ['1', 'center', true],
      ['TRUE', 'center', false],
      ['#DIV/0!', 'center', false],
    ]);
  });

  test('a merge spans its visible cells and hides the ones it covers', () => {
    const grid = buildSheetGrid(
      source(
        { A1: cell('Merged note'), D3: cell('x') },
        { merges: [{ top: 0, left: 0, bottom: 1, right: 2 }], hiddenCols: new Set([1]) }
      )
    );
    // B is hidden, so the merge spans A and C only.
    expect(grid.rows[0]?.cells[0]).toMatchObject({ text: 'Merged note', colSpan: 2, rowSpan: 2 });
    expect(grid.rows[0]?.cells.map((c) => c.col)).toEqual([0, 3]);
    expect(grid.rows[1]?.cells.map((c) => c.col)).toEqual([3]);
  });

  test('hidden rows are left out', () => {
    const grid = buildSheetGrid(
      source({ A1: cell('a'), A2: cell('b'), A3: cell('c') }, { hiddenRows: new Set([1]) })
    );
    expect(grid.rows.map((row) => row.index)).toEqual([0, 2]);
  });

  test('keeps column widths in Excel units and turns row heights from points into pixels', () => {
    const grid = buildSheetGrid(
      source(
        { A1: cell('a'), B1: cell('b'), A2: cell('c') },
        { colWidths: new Map([[0, 30]]), rowHeights: new Map([[0, 45]]) }
      )
    );
    // The view multiplies by the rendered font's digit width: 30 × 7px = 210px at Calibri 11.
    expect(grid.columns[0]?.width).toBe(30);
    // An unsized column is Excel's 8.43 characters plus padding: 64px at a 7px digit.
    expect(Math.round(grid.columns[1]!.width * 7)).toBe(64);
    expect(grid.rows.map((row) => row.heightPx)).toEqual([60, 20]);
  });

  test('a sheet’s own default width and height replace Excel’s', () => {
    const grid = buildSheetGrid(
      source({ A1: cell('a') }, { defaultColWidth: 12, defaultRowHeight: 18 })
    );
    expect(grid.columns[0]?.width).toBe(12);
    expect(grid.rows[0]?.heightPx).toBe(24);
  });

  test('text spills into an empty neighbour but is clipped by a full one', () => {
    const grid = buildSheetGrid(
      source({
        A1: cell('A long description'),
        A2: cell('Clipped description'),
        B2: cell('4', 'number'),
      })
    );
    expect(grid.rows[0]?.cells[0]?.overflow).toBe(true);
    expect(grid.rows[1]?.cells[0]?.overflow).toBe(false);
  });

  test('a top border is drawn by the cell above, so the gridline cannot hide it', () => {
    const rule = { widthPx: 3, line: 'double', color: '#1f4e78' } as const;
    const grid = buildSheetGrid(
      source({
        A1: cell('1', 'number'),
        A2: cell('2', 'number', { borders: { top: { widthPx: 1, line: 'solid' }, bottom: rule } }),
      })
    );
    const above = grid.rows[0]!.cells[0]!;
    const own = grid.rows[1]!.cells[0]!;
    expect(above.edges.bottom).toEqual({ widthPx: 1, line: 'solid' });
    expect(own.edges.top).toBeUndefined();
    expect(own.edges.bottom).toEqual(rule);
    expect(cellCss(above).borderBottom).toBe('1px solid var(--sheet-ink)');
  });

  test('cellCss carries bold and fill, and a filled cell hides its own gridlines', () => {
    const grid = buildSheetGrid(
      source({ A1: cell('Item', 'text', { bold: true, color: '#ffffff', fill: '#4472c4' }) })
    );
    expect(cellCss(grid.rows[0]!.cells[0]!)).toMatchObject({
      fontWeight: 700,
      color: '#ffffff',
      backgroundColor: '#4472c4',
      borderRightColor: '#4472c4',
      borderBottomColor: '#4472c4',
    });
  });

  test('an empty sheet is drawn as a blank grid, not cut to nothing', () => {
    const grid = buildSheetGrid(source({}));
    expect(grid.rows.length).toBe(BLANK_SHEET_ROWS);
    expect(grid.columns.map((column) => column.label)).toEqual(
      Array.from({ length: BLANK_SHEET_COLS }, (_, index) => columnLabel(index))
    );
    expect(grid.rows[0]!.cells.every((cell) => cell.text === '')).toBe(true);
    expect(grid.truncated).toBe(false);
  });

  test('stops at the row cap and says so, counting content past it', () => {
    const grid = buildSheetGrid(source({ A1: cell('a') }, { extent: { rows: 5000, cols: 1 } }));
    expect(grid.rows.length).toBe(MAX_PREVIEW_ROWS);
    expect(grid.totalRows).toBe(5000);
    expect(grid.truncated).toBe(true);
  });

  test('labels columns past Z', () => {
    expect([0, 25, 26, 701, 702].map(columnLabel)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']);
  });
});

/** A formatted workbook written by ExcelTS itself, then read back the way the preview reads it. */
async function writeBudget(): Promise<ArrayBuffer> {
  const workbook = new ExcelTs.Workbook();
  const budget = workbook.addWorksheet('Budget');
  budget.mergeCells('A1:C1');
  budget.getCell('A1').value = 'Cost Summary';
  budget.getCell('A1').font = { bold: true, size: 16 };
  budget.getCell('A1').alignment = { horizontal: 'center' };
  budget.getRow(2).values = ['Item', 'Unit cost', 'Due'];
  budget.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  budget.getCell('A3').value = 'Concrete';
  budget.getCell('A3').font = { italic: true, color: { argb: 'FFFF0000' } };
  budget.getCell('B3').value = 1450.5;
  budget.getCell('B3').numFmt = '"$"#,##0.00';
  budget.getCell('C3').value = new Date(Date.UTC(2027, 0, 1));
  budget.getCell('C3').numFmt = 'mmm d, yyyy';
  budget.getCell('B4').border = { bottom: { style: 'double' } };
  budget.getColumn(1).width = 30;
  budget.getRow(3).height = 45;
  workbook.addWorksheet('Schedule', {
    properties: { tabColor: { argb: 'FF00B050' } },
    views: [{ zoomScale: 75 }],
  });
  workbook.addWorksheet('Secret', { state: 'hidden' });
  workbook.addWorksheet('Notes');
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

describe('readWorkbook (ExcelTS end to end)', () => {
  test('lists the visible sheets with their tab colors', async () => {
    const workbook = await readWorkbook(ExcelTs, await writeBudget());
    expect(workbook.sheets.map((sheet) => [sheet.name, sheet.tabColor])).toEqual([
      ['Budget', undefined],
      ['Schedule', '#00b050'],
      ['Notes', undefined],
    ]);
    expect(workbook.activeIndex).toBe(0);
  });

  test('keeps formatting, formats numbers and dates, and keeps sizes and merges', async () => {
    const workbook = await readWorkbook(ExcelTs, await writeBudget());
    const grid = workbook.sheets[0]!.buildGrid();
    const at = (row: number, col: number) =>
      grid.rows.find((r) => r.index === row)?.cells.find((c) => c.col === col);

    expect(at(0, 0)).toMatchObject({ text: 'Cost Summary', colSpan: 3, align: 'center' });
    expect(at(0, 0)?.style).toMatchObject({ bold: true, fontSizePt: 16 });
    expect(at(1, 0)?.style.fill).toBe('#ffff00');
    expect(at(2, 0)?.style).toMatchObject({ italic: true, color: '#ff0000' });
    expect(at(2, 1)).toMatchObject({ text: '$1,450.50', align: 'right', numeric: true });
    // The suite runs on a New York clock, where a calendar date read through
    // local time would show Dec 31.
    expect(at(2, 2)?.text).toBe('Jan 1, 2027');
    // A formatted blank still draws its rule.
    expect(at(3, 1)?.style.borders?.bottom).toMatchObject({ widthPx: 3, line: 'double' });
    expect(grid.columns[0]?.width).toBe(30);
    expect(grid.rows[2]?.heightPx).toBe(60);
  });

  test('a file that is not a workbook rejects instead of rendering garbage', async () => {
    const bytes = new TextEncoder().encode('Item,Qty\nConcrete,12\n');
    await expect(readWorkbook(ExcelTs, bytes.buffer as ArrayBuffer)).rejects.toThrow();
  });
});

describe('sheet zoom', () => {
  test('− and + move to the next multiple of 10, as Excel’s buttons do', () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
    expect(stepZoom(87, 1)).toBe(90);
    expect(stepZoom(87, -1)).toBe(80);
  });

  test('stays between 10% and 400%', () => {
    expect(stepZoom(10, -1)).toBe(10);
    expect(stepZoom(400, 1)).toBe(400);
    expect(clampZoom(1000)).toBe(400);
    expect(clampZoom(Number.NaN)).toBe(100);
  });

  test('the slider puts 100% at its middle, and round-trips', () => {
    expect(zoomToSlider(100)).toBe(50);
    expect(zoomToSlider(10)).toBe(0);
    expect(zoomToSlider(400)).toBe(100);
    for (const zoom of [10, 55, 100, 175, 400]) expect(sliderToZoom(zoomToSlider(zoom))).toBe(zoom);
  });

  test('scrolling up zooms in, down zooms out, proportionally and within bounds', () => {
    expect(wheelZoom(100, -10)).toBeGreaterThan(100);
    expect(wheelZoom(100, 10)).toBeLessThan(100);
    expect(wheelZoom(400, -100)).toBe(400);
    // One mouse-wheel notch is about 10%, not a jump across the range — and
    // multiplicative, so a notch in then a notch out lands back where it began.
    expect(wheelZoom(100, 100)).toBe(90);
    expect(wheelZoom(100, -100)).toBe(111);
    expect(wheelZoom(wheelZoom(200, -100), 100)).toBe(200);
    // A pinch's tiny deltas still move, one percent at a time.
    expect(wheelZoom(100, -1)).toBe(101);
    expect(wheelZoom(10, 100)).toBe(10);
  });
});

describe('pinch zoom', () => {
  test('spreading the fingers to twice their distance doubles the zoom it started at', () => {
    expect(pinchZoom(100, 2)).toBe(200);
    expect(pinchZoom(150, 0.5)).toBe(75);
  });

  test('is measured from the start, so a slow pinch does not drift', () => {
    // 100 small steps reported against the start, each a little wider.
    let zoom = 100;
    for (let step = 1; step <= 100; step += 1) zoom = pinchZoom(100, 1 + step * 0.01);
    expect(zoom).toBe(200);
  });

  test('stays between 10% and 400%, and ignores a nonsense scale', () => {
    expect(pinchZoom(100, 10)).toBe(400);
    expect(pinchZoom(100, 0.01)).toBe(10);
    expect(pinchZoom(120, 0)).toBe(120);
    expect(pinchZoom(120, Number.NaN)).toBe(120);
  });

  test('measures the distance between two touches', () => {
    expect(touchDistance({ clientX: 0, clientY: 0 }, { clientX: 30, clientY: 40 })).toBe(50);
  });
});

describe('isWorkbookPreviewable', () => {
  test('an .xlsx sent as octet-stream still previews', () => {
    expect(
      isWorkbookPreviewable({ name: 'Budget.xlsx', mimeType: 'application/octet-stream' })
    ).toBe(true);
  });

  test('.xlsm previews, by name or MIME type', () => {
    expect(isWorkbookPreviewable({ name: 'Macro.XLSM' })).toBe(true);
    expect(
      isWorkbookPreviewable({
        name: 'abc123',
        mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      })
    ).toBe(true);
  });

  test('legacy .xls and .ods fall back to a download — ExcelTS cannot read them', () => {
    expect(isWorkbookPreviewable({ name: 'Old.xls', mimeType: 'application/vnd.ms-excel' })).toBe(
      false
    );
    expect(isWorkbookPreviewable({ name: 'Schedule.ods' })).toBe(false);
  });

  test('a .csv stays on the text path whatever its MIME type', () => {
    expect(
      isWorkbookPreviewable({
        name: 'export.csv',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    ).toBe(false);
    expect(isWorkbookPreviewable({ name: 'export.tsv' })).toBe(false);
  });

  test('a workbook MIME type previews without an extension in the name', () => {
    expect(
      isWorkbookPreviewable({
        name: 'Budget',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    ).toBe(true);
  });

  test('other office files are not handed to the workbook renderer', () => {
    expect(isWorkbookPreviewable({ name: 'Deck.pptx' })).toBe(false);
    expect(isWorkbookPreviewable({ name: 'Scope.docx' })).toBe(false);
    expect(isWorkbookPreviewable({ name: 'budget.xlsx.zip' })).toBe(false);
  });
});

describe('thumbnail crop', () => {
  /** A sheet with a value in every cell up to `rows` × `cols`. */
  function filled(rows: number, cols: number, extra: Partial<SheetSource> = {}) {
    const cells: Record<string, SourceCell> = {};
    for (let row = 1; row <= rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        cells[`${columnLabel(col)}${row}`] = cell(`${row}`);
      }
    }
    return buildSheetGrid(source(cells, extra));
  }

  test('a full-size sheet draws only the corner the tile shows', () => {
    const full = filled(MAX_PREVIEW_ROWS, 50);
    const crop = cropSheetGrid(full, 40, 20);
    expect(crop.rows).toHaveLength(40);
    expect(crop.columns).toHaveLength(20);
    expect(crop.rows.every((row) => row.cells.length === 20)).toBe(true);
    expect(crop.rows.reduce((n, row) => n + row.cells.length, 0)).toBe(800);
  });

  test('hidden rows and columns do not use up the budget', () => {
    const full = filled(10, 6, { hiddenRows: new Set([0, 1]), hiddenCols: new Set([0]) });
    const crop = cropSheetGrid(full, 3, 2);
    expect(crop.rows.map((row) => row.index)).toEqual([2, 3, 4]);
    expect(crop.columns.map((column) => column.label)).toEqual(['B', 'C']);
  });

  test('a merge running past the edge is cut at it', () => {
    const full = filled(6, 6, { merges: [{ top: 1, left: 1, bottom: 5, right: 5 }] });
    const merged = cropSheetGrid(full, 3, 3).rows[1]?.cells.find((c) => c.col === 1);
    expect(merged?.colSpan).toBe(2);
    expect(merged?.rowSpan).toBe(2);
  });

  test('a sheet already inside the crop is returned as is', () => {
    const full = filled(5, 3);
    expect(cropSheetGrid(full, 40, 20)).toBe(full);
  });
});
