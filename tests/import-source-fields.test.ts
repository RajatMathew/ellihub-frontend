import { describe, expect, test } from 'bun:test';

import { importedBadges } from '../src/app/components/import-source/imported-badges';
import {
  formatImportedValue,
  importedLinkHref,
  importSourceSchema,
  type ImportedField,
} from '../src/app/lib/import-source';

/**
 * What an import kept with a record, as elli-core sends it: labelled values
 * with a kind - a payment's method, a change order's markup, the workbook row
 * cell by cell - shown the same way on every page.
 */
const source = {
  fileName: 'Brookhaven National Lab Elli.xlsx',
  fileId: 'file0001',
  sheet: 'PO_CHANGE_ORDERS',
  row: 5,
  legacyNumber: 'CO # 23450-02',
  importedAt: '2026-09-28T10:00:00.000Z',
  importedBy: { id: 'user0001', name: 'Fayis' },
};

const field = (kind: ImportedField['kind'], value: ImportedField['value']): ImportedField => ({
  label: 'Value',
  value,
  kind,
});

describe('an imported value', () => {
  test('is shown by its kind', () => {
    expect(formatImportedValue(field('money', '1050884.00'))).toBe('$1,050,884.00');
    expect(formatImportedValue(field('percent', 10))).toBe('10.00%');
    expect(formatImportedValue(field('number', 4))).toBe('4');
    expect(formatImportedValue(field('number', 2.5))).toBe('2.5');
    expect(formatImportedValue(field('text', 'Paypal Amex'))).toBe('Paypal Amex');
    expect(formatImportedValue(field('text', true))).toBe('Yes');
  });

  test('that is blank shows a dash', () => {
    expect(formatImportedValue(field('text', null))).toBe('—');
    expect(formatImportedValue(field('text', ''))).toBe('—');
  });

  test('that is a date shows its own day wherever the reader is', () => {
    // Midnight UTC is still the previous evening in New York.
    expect(formatImportedValue(field('date', '2024-06-06'))).toBe('Jun 6, 2024');
    expect(formatImportedValue(field('date', '2024-03-01T00:00:00.000Z'))).toBe('Mar 1, 2024');
    expect(formatImportedValue(field('date', '6/2/2021'))).toBe('Jun 2, 2021');
  });

  test('in a date column that holds no date shows what the workbook says', () => {
    // A workbook date column can hold a note; it read "Invalid Date".
    expect(formatImportedValue(field('date', 'TBD'))).toBe('TBD');
  });

  test('that is a link opens only when it is a web link', () => {
    expect(importedLinkHref(field('link', 'https://ellicorp.sharepoint.com/po.pdf'))).toBe(
      'https://ellicorp.sharepoint.com/po.pdf'
    );
    expect(importedLinkHref(field('link', 'javascript:alert(1)'))).toBeNull();
    expect(importedLinkHref(field('text', 'https://example.com'))).toBeNull();
  });
});

describe("a record's import source", () => {
  test('from before details were sent still parses, with none', () => {
    const parsed = importSourceSchema.parse(source);

    expect(parsed.details).toEqual([]);
    expect(parsed.workbookRow).toBeUndefined();
  });

  test('keeps its details and workbook row', () => {
    const parsed = importSourceSchema.parse({
      ...source,
      details: [{ label: 'Markup', value: 10, kind: 'percent' }],
      workbookRow: [{ label: 'PO_CO_ID', value: 'CO # 23450-02', kind: 'text' }],
    });

    expect(parsed.details).toEqual([{ label: 'Markup', value: 10, kind: 'percent' }]);
    expect(parsed.workbookRow).toHaveLength(1);
  });

  test('reads a kind this client does not know yet as text, rather than failing the page', () => {
    const parsed = importSourceSchema.parse({
      ...source,
      details: [{ label: 'Area', value: '120 sq ft', kind: 'area' }],
    });

    expect(parsed.details[0].kind).toBe('text');
  });

  test('marks the record as imported in its header, and nothing otherwise', () => {
    expect(importedBadges(importSourceSchema.parse(source))).toMatchObject([
      { label: 'Imported', variant: 'info' },
    ]);
    expect(importedBadges(null)).toEqual([]);
  });
});
