import { describe, expect, test } from 'bun:test';

import { splitReferenceLabel } from '../src/modules/email/lib/email-reference-label';

describe('splitting a linked record label', () => {
  test('keeps a code that contains hyphens whole', () => {
    // The bug: splitting on the first hyphen made this "2026" / "001 - Testing".
    expect(splitReferenceLabel('2026-001 - Testing')).toEqual({
      code: '2026-001',
      name: 'Testing',
    });
  });

  test('splits on an en dash the same way', () => {
    expect(splitReferenceLabel('RFQ-30000-002 – Reception veneer')).toEqual({
      code: 'RFQ-30000-002',
      name: 'Reception veneer',
    });
  });

  test('splits at the first spaced dash, not the last', () => {
    expect(splitReferenceLabel('PO-23108 - Millwork - phase two')).toEqual({
      code: 'PO-23108',
      name: 'Millwork - phase two',
    });
  });

  test('a label with no separator is all code', () => {
    expect(splitReferenceLabel('28100-25')).toEqual({ code: '28100-25', name: null });
  });

  test('trims the surrounding whitespace off both halves', () => {
    expect(splitReferenceLabel('  JOB-7   –   Lobby fitout  ')).toEqual({
      code: 'JOB-7',
      name: 'Lobby fitout',
    });
  });
});
