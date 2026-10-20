import { describe, expect, test } from 'bun:test';

import {
  FILE_FORMAT_TONES,
  getFileFormatLabel,
  getFileFormatTone,
} from '../src/app/lib/file-format';

describe('getFileFormatLabel', () => {
  test('names the format from the extension, not the rest of the name', () => {
    expect(getFileFormatLabel('SUB-2024-018_ReceptionDesk_Veneer.pdf')).toBe('PDF');
    expect(getFileFormatLabel('ShopDwg_ReceptionDesk_Rev2.dwg')).toBe('DWG');
  });

  test('clips a long extension rather than widening the badge', () => {
    expect(getFileFormatLabel('budget.xlsx')).toBe('XLSX');
    expect(getFileFormatLabel('drawing.sketch')).toBe('SKET');
  });

  test('falls back to the MIME subtype, then to FILE', () => {
    // An attached email is named after its subject and has no extension —
    // the case the chip used to render as an unidentifiable file.
    expect(getFileFormatLabel('Payment for March', 'message/rfc822')).toBe('RFC8');
    expect(getFileFormatLabel('Payment for March')).toBe('FILE');
    expect(getFileFormatLabel(null)).toBe('FILE');
  });

  test('a dot inside a name is not an extension', () => {
    expect(getFileFormatLabel('Re: invoice 4.2 approved')).toBe('FILE');
    expect(getFileFormatLabel('trailing.')).toBe('FILE');
    expect(getFileFormatLabel('.gitignore')).toBe('FILE');
  });
});

describe('getFileFormatTone', () => {
  test('gives the named formats their own colour', () => {
    expect(getFileFormatTone('spec.pdf')).toBe('red');
    expect(getFileFormatTone('costs.xlsx')).toBe('green');
    expect(getFileFormatTone('elevation.dwg')).toBe('navy');
    expect(getFileFormatTone('site.JPG')).toBe('cyan');
  });

  test('an unknown format keeps the same colour on every call', () => {
    // #1045: "getting a random color on each refresh would be bad" — the tone
    // is a function of the extension and nothing else.
    const first = getFileFormatTone('model.ifczip');
    const second = getFileFormatTone('SOMETHING_ELSE.ifczip');
    expect(second).toBe(first);
    expect(FILE_FORMAT_TONES).toContain(first);
  });

  test('reads the MIME type when the name carries no extension', () => {
    expect(getFileFormatTone('Scan from the site', 'image/png')).toBe('cyan');
    expect(getFileFormatTone('Voicemail', 'audio/mpeg')).toBe('violet');
    expect(getFileFormatTone('Payment for March')).toBe('slate');
  });
});
