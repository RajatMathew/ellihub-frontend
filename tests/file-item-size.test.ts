import { describe, expect, test } from 'bun:test';

import { describeFileItemSize, getFileItemBytes } from '../src/modules/files/lib/file-item-size';

/**
 * The Size column. A folder used to show "-"; it now shows what is inside it,
 * from the totals the API keeps for every folder.
 */

const file = (size: number | null) => ({ type: 'FILE' as const, size });
const folder = (totalSize: number | null, fileCount: number | null) => ({
  type: 'FOLDER' as const,
  size: null,
  totalSize,
  fileCount,
});

describe('the Size column', () => {
  test('shows a folder by everything inside it, with its file count on hover', () => {
    expect(describeFileItemSize(folder(176_383_020, 19))).toEqual({
      label: '168.2 MB',
      title: '19 files',
    });
    expect(describeFileItemSize(folder(73_366, 1)).title).toBe('1 file');
  });

  test('says a folder with nothing in it is empty', () => {
    expect(describeFileItemSize(folder(0, 0))).toEqual({ label: 'Empty', title: 'No files' });
  });

  test('shows "-" where the API sends no total', () => {
    expect(describeFileItemSize(folder(null, null)).label).toBe('-');
    expect(describeFileItemSize({ type: 'FOLDER', size: null }).label).toBe('-');
  });

  test('still shows a file by its own size', () => {
    expect(describeFileItemSize(file(2_936_013)).label).toBe('2.8 MB');
  });
});

describe('sorting by size', () => {
  test('weighs a folder by everything inside it, and a file by itself', () => {
    expect(getFileItemBytes(folder(176_383_020, 19))).toBe(176_383_020);
    expect(getFileItemBytes(file(512))).toBe(512);
  });

  test('has no number for a folder whose total was not sent', () => {
    expect(getFileItemBytes(folder(null, null))).toBeNull();
  });
});
