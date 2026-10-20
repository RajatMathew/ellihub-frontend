import { describe, expect, test } from 'bun:test';

import { internalSheetTarget, safeHref } from '../src/modules/files/lib/file-preview-links';

describe('safeHref', () => {
  test('web, email and phone links are clickable', () => {
    expect(safeHref('https://info.gilbaneco.com/gilbane-rising-contractors')).toBe(
      'https://info.gilbaneco.com/gilbane-rising-contractors'
    );
    expect(safeHref('mailto:Steven@ellicorp.com')).toBe('mailto:Steven@ellicorp.com');
    expect(safeHref('tel:+15717484366')).toBe('tel:+15717484366');
  });

  test('a bare www. domain, as Excel often stores a typed link, becomes https', () => {
    expect(safeHref('www.qtohouse.com')).toBe('https://www.qtohouse.com/');
  });

  test('script, data, file and unparseable targets stay plain text', () => {
    for (const target of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///C:/Users/estimator/logo.png',
      'C:\\Users\\estimator\\logo.png',
      'vbscript:msgbox',
      '',
      undefined,
    ]) {
      expect(safeHref(target)).toBeUndefined();
    }
  });
});

describe('internalSheetTarget', () => {
  test('reads the sheet of an in-workbook link, quoted or not, with or without #', () => {
    expect(internalSheetTarget("#'Bid Form'!A1")).toBe('Bid Form');
    expect(internalSheetTarget("'Owner''s Notes'!B2")).toBe("Owner's Notes");
    expect(internalSheetTarget('#Workforce!$C$8')).toBe('Workforce');
    expect(internalSheetTarget('Sheet2!B4')).toBe('Sheet2');
  });

  test('a web address is not mistaken for a sheet', () => {
    expect(internalSheetTarget('https://example.com/a!b1')).toBeUndefined();
    expect(internalSheetTarget('mailto:a@b.com')).toBeUndefined();
  });
});
