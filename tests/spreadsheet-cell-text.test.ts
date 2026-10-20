import { describe, expect, test } from 'bun:test';

import { fontStack } from '../src/modules/files/lib/spreadsheet/cell-style';
import {
  formatNumber,
  formatSections,
  formatText,
  normalizeCurrencyCodes,
} from '../src/modules/files/lib/spreadsheet/cell-text';
import * as ExcelTs from '../src/modules/files/lib/spreadsheet/excelts';
import {
  buildSheetGrid,
  runCss,
  type SheetSource,
} from '../src/modules/files/lib/spreadsheet/sheet-grid';
import { readWorkbook } from '../src/modules/files/lib/spreadsheet/workbook';

/** Excel's own accounting format, as the PS004X estimate's price columns carry it. */
const ACCOUNTING = '_-[$$-409]* #,##0_ ;_-[$$-409]* -#,##0 ;_-[$$-409]* "-"??_ ;_-@_ ';

describe('cell text', () => {
  test('a text header in an accounting column reads as itself, not `_-UNIT PRICE_`', () => {
    expect(formatText('UNIT PRICE', ACCOUNTING)).toBe(' UNIT PRICE ');
    expect(
      formatText('Label', '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)')
    ).toBe(' Label ');
  });

  test('a text section’s literals are kept; a format without one leaves text alone', () => {
    expect(formatText('abc', '"Item: "@')).toBe('Item: abc');
    expect(formatText('abc', '[Red]@')).toBe('abc');
    expect(formatText('abc', '#,##0.00')).toBe('abc');
    expect(formatText('abc', '0;-0;0')).toBe('abc');
    expect(formatText('abc', undefined)).toBe('abc');
  });

  test('splits sections without breaking on a quoted or escaped semicolon', () => {
    expect(formatSections(String.raw`0;"a;b"@;\;x`)).toEqual(['0', '"a;b"@', String.raw`\;x`]);
  });

  test('a currency code becomes the literal ExcelTS keeps, so `$` is not dropped', () => {
    expect(normalizeCurrencyCodes('[$$-409]#,##0')).toBe('"$"#,##0');
    expect(normalizeCurrencyCodes('[$€-x-euro2] #,##0.00')).toBe('"€" #,##0.00');
    expect(normalizeCurrencyCodes('[$-409]mmm d')).toBe('mmm d');
    expect(normalizeCurrencyCodes('[Red]0')).toBe('[Red]0');
  });

  test('accounting numbers keep their dollar sign', () => {
    // `* ` (fill the cell with spaces) is left out, so `$` sits next to the number.
    expect(formatNumber(1234, ACCOUNTING, ExcelTs.formatCellValue).trim()).toBe('$1,234');
    expect(formatNumber(1234, undefined, ExcelTs.formatCellValue)).toBe('1234');
  });

  test('Calibri falls back to Carlito, its metric twin; a serif font to serif', () => {
    expect(fontStack('Calibri')).toBe('"Calibri", "Carlito", sans-serif');
    expect(fontStack('Arial')).toBe('"Arial", sans-serif');
    expect(fontStack('Times New Roman')).toBe('"Times New Roman", serif');
  });
});

function source(extra: Partial<SheetSource>): SheetSource {
  return {
    cells: new Map(),
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

const medium = { widthPx: 2, line: 'solid' } as const;

describe('merged cell borders', () => {
  test('a merge takes its right and bottom outline from the cells along those edges', () => {
    // B2:C3 as Excel stores it: left/top on B2, right on C2, bottom on B3.
    const grid = buildSheetGrid(
      source({
        cells: new Map([
          ['1:1', { text: '', kind: 'text', style: { borders: { left: medium, top: medium } } }],
          ['1:2', { text: '', kind: 'text', style: { borders: { right: medium, top: medium } } }],
          ['2:1', { text: '', kind: 'text', style: { borders: { left: medium, bottom: medium } } }],
          [
            '2:2',
            { text: '', kind: 'text', style: { borders: { right: medium, bottom: medium } } },
          ],
          ['3:3', { text: 'x', kind: 'text', style: {} }],
        ]),
        merges: [{ top: 1, left: 1, bottom: 2, right: 2 }],
      })
    );
    const merged = grid.rows[1]!.cells.find((cell) => cell.col === 1)!;
    expect(merged.edges.right).toEqual(medium);
    expect(merged.edges.bottom).toEqual(medium);
    // The left and top are drawn by the neighbours above and to the left.
    expect(grid.rows[0]!.cells.find((cell) => cell.col === 1)!.edges.bottom).toEqual(medium);
    expect(grid.rows[1]!.cells.find((cell) => cell.col === 0)!.edges.right).toEqual(medium);
  });

  test('a top rule over a covered cell is drawn, though no cell is drawn there', () => {
    // D2:F2 merged; E2 (covered) carries its own top rule, as Excel writes it.
    const grid = buildSheetGrid(
      source({
        cells: new Map([
          ['1:3', { text: 'Title', kind: 'text', style: { borders: { top: medium } } }],
          ['1:4', { text: '', kind: 'text', style: { borders: { top: medium } } }],
          ['1:5', { text: '', kind: 'text', style: { borders: { top: medium } } }],
        ]),
        merges: [{ top: 1, left: 3, bottom: 1, right: 5 }],
      })
    );
    const above = grid.rows[0]!.cells;
    expect([3, 4, 5].map((col) => above.find((cell) => cell.col === col)!.edges.bottom)).toEqual([
      medium,
      medium,
      medium,
    ]);
  });
});

describe('rich text', () => {
  test('a run that sets a font sets all of it — what it leaves out is off and black', () => {
    expect(runCss({ bold: true, color: '#ff0000', fontSizePt: 14 })).toEqual({
      fontWeight: 700,
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#ff0000',
      fontSize: '14pt',
      fontFamily: undefined,
    });
    expect(runCss({}).color).toBe('var(--sheet-ink)');
  });

  test('reads each run of a rich-text cell, end to end through ExcelTS', async () => {
    const workbook = new ExcelTs.Workbook();
    const sheet = workbook.addWorksheet('QTO');
    sheet.getCell('A1').value = {
      richText: [
        { text: 'Web: ', font: { bold: true, size: 14, color: { argb: 'FFFF0000' } } },
        { text: 'qtohouse.com' },
      ],
    };
    sheet.getCell('B1').value = 'UNIT PRICE';
    sheet.getCell('B1').numFmt = ACCOUNTING;
    sheet.getCell('C1').value = 1234;
    sheet.getCell('C1').numFmt = ACCOUNTING;
    const buffer = await workbook.xlsx.writeBuffer();
    const read = await readWorkbook(
      ExcelTs,
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    );
    const [a1, b1, c1] = read.sheets[0]!.buildGrid().rows[0]!.cells;
    expect(a1!.text).toBe('Web: qtohouse.com');
    expect(a1!.runs).toEqual([
      { text: 'Web: ', style: { bold: true, fontSizePt: 14, color: '#ff0000' } },
      { text: 'qtohouse.com', style: undefined },
    ]);
    expect(b1!.text).toBe(' UNIT PRICE ');
    expect(c1!.text.trim()).toBe('$1,234');
  });
});

describe('links and rotation, end to end through ExcelTS', () => {
  async function read(build: (workbook: InstanceType<typeof ExcelTs.Workbook>) => void) {
    const workbook = new ExcelTs.Workbook();
    build(workbook);
    const buffer = await workbook.xlsx.writeBuffer();
    return readWorkbook(
      ExcelTs,
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    );
  }

  test('cell links: web and email are followable, script is not, a sheet link opens its tab', async () => {
    const workbook = await read((book) => {
      const sheet = book.addWorksheet('General Info');
      book.addWorksheet('Bid Form');
      book.addWorksheet('Secret', { state: 'hidden' });
      sheet.getCell('A1').value = { text: 'Program', hyperlink: 'https://info.gilbaneco.com/x' };
      sheet.getCell('A2').value = { text: 'Email', hyperlink: 'mailto:greg@constru.com' };
      sheet.getCell('A3').value = { text: 'Bad', hyperlink: 'javascript:alert(1)' };
      sheet.getCell('A4').value = { text: 'Bid form', hyperlink: "#'Bid Form'!A1" };
      sheet.getCell('A5').value = { text: 'Hidden', hyperlink: '#Secret!A1' };
    });
    const links = workbook.sheets[0]!.buildGrid().rows.map((row) => row.cells[0]!.link);
    expect(links).toEqual([
      { kind: 'url', href: 'https://info.gilbaneco.com/x' },
      { kind: 'url', href: 'mailto:greg@constru.com' },
      undefined,
      { kind: 'sheet', sheet: 'Bid Form' },
      // A hidden sheet has no tab to open.
      undefined,
    ]);
  });

  test('reads angled, vertical and stacked text', async () => {
    const workbook = await read((book) => {
      const sheet = book.addWorksheet('Workforce');
      sheet.getRow(1).values = ['Laborer', 'Down', 'Up', 'Stacked'];
      sheet.getCell('A1').alignment = { textRotation: 45 };
      sheet.getCell('B1').alignment = { textRotation: -45 };
      sheet.getCell('C1').alignment = { textRotation: 90 };
      sheet.getCell('D1').alignment = { textRotation: 'vertical' };
    });
    const styles = workbook.sheets[0]!.buildGrid().rows[0]!.cells.map((cell) => [
      cell.style.rotation,
      cell.style.stacked,
    ]);
    expect(styles).toEqual([
      [45, undefined],
      [-45, undefined],
      [90, undefined],
      [undefined, true],
    ]);
  });
});
