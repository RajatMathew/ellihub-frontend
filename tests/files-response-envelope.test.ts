import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { readEnvelopeData } from '../src/modules/files/lib/response-envelope';

/**
 * An explicit `data: null` from the API is the answer, not a missing field.
 *
 * `GET /file/export/active` answers `{ success: true, message: 'OK', data: null }`
 * when no export is running. The files API unwrapped every response with
 * `res.data?.data ?? res.data`, so that null fell back to the whole envelope,
 * `parseNullableExportJob` rejected it, and every Files page load logged
 * "[filesApi.getActiveFolderExportJob] Zod parse error" to the console and Sentry.
 */
describe('readEnvelopeData', () => {
  test('reads an explicit null as null, not as the envelope', () => {
    expect(readEnvelopeData({ success: true, message: 'OK', data: null })).toBeNull();
  });

  test('reads the payload out of the envelope', () => {
    const job = { id: 'job-1', status: 'RUNNING' };

    expect(readEnvelopeData({ success: true, message: 'OK', data: job })).toBe(job);
    expect(readEnvelopeData({ success: true, data: 'https://files/download' })).toBe(
      'https://files/download'
    );
    expect(readEnvelopeData({ data: [] })).toEqual([]);
  });

  test('returns a body with no data key as it is', () => {
    const bare = { id: 'job-1' };

    expect(readEnvelopeData(bare)).toBe(bare);
    expect(readEnvelopeData('folder-id')).toBe('folder-id');
    expect(readEnvelopeData(null)).toBeNull();
    expect(readEnvelopeData(undefined)).toBeUndefined();
  });
});

describe('files API', () => {
  const source = readFileSync(
    join(import.meta.dir, '..', 'src/modules/files/api/files.api.ts'),
    'utf8'
  );

  test('unwraps every response through readEnvelopeData', () => {
    // `x?.data ?? x` is the unwrap that turned a null answer into the envelope.
    const nullishUnwraps = source.match(/\b\w+\.data\?\.data \?\?[^\r\n]*/g) ?? [];

    expect(nullishUnwraps).toEqual([]);
    expect(source).toContain('readEnvelopeData(res.data)');
  });
});
