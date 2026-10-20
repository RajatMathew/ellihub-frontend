import { describe, expect, test } from 'bun:test';

import {
  FILE_SECTION_LABELS,
  getFileSection,
  sectionFileItems,
} from '../src/modules/files/lib/file-sections';
import type { FileItem } from '../src/modules/files/schemas/file.schema';

/**
 * A Files listing is split in two: what Elli creates and keeps (the API sends
 * it with `isDeletable: false`), then what people upload or create themselves.
 */

const item = (id: string, isDeletable: boolean) => ({ id, isDeletable }) as unknown as FileItem;

describe('the Files listing sections', () => {
  test('are called System Files and User Files', () => {
    expect(FILE_SECTION_LABELS).toEqual({ system: 'System Files', user: 'User Files' });
  });

  test('put what cannot be deleted under System Files, and the rest under User Files', () => {
    expect(getFileSection(item('project-folder', false))).toBe('system');
    expect(getFileSection(item('upload', true))).toBe('user');
  });

  test('list System Files first, each group keeping its incoming order', () => {
    const sectioned = sectionFileItems([
      item('upload-a', true),
      item('projects', false),
      item('upload-b', true),
      item('vendor', false),
    ]);

    expect(sectioned.systemItems.map(({ id }) => id)).toEqual(['projects', 'vendor']);
    expect(sectioned.userItems.map(({ id }) => id)).toEqual(['upload-a', 'upload-b']);
    expect(sectioned.data.map(({ id }) => id)).toEqual([
      'projects',
      'vendor',
      'upload-a',
      'upload-b',
    ]);
  });

  test('leaves a group empty rather than inventing one', () => {
    const sectioned = sectionFileItems([item('upload', true)]);

    expect(sectioned.systemItems).toEqual([]);
    expect(sectioned.data.map(({ id }) => id)).toEqual(['upload']);
  });
});
