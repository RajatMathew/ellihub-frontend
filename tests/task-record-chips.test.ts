import { describe, expect, test } from 'bun:test';

import {
  splitTaskRecordChips,
  taskRecordChipColor,
  taskRecordChipText,
  taskRecordChipTitle,
} from '../src/modules/tasks/lib/task-record-chips';

/**
 * elli-ui#1406 — a task card listed its linked records as `PROJECT · EN5KDDDH`,
 * the record's id. It now shows names.
 */

describe('what a chip reads', () => {
  test('a project by its name, never its id', () => {
    const text = taskRecordChipText({ entityType: 'project', label: '30000 - PS 082K' });
    expect(text).toBe('PS 082K');
  });

  test('a project with no job number by its whole name', () => {
    expect(taskRecordChipText({ entityType: 'project', label: 'Website Revamp' })).toBe(
      'Website Revamp'
    );
  });

  test('a PO or RFQ by its number', () => {
    expect(
      taskRecordChipText({ entityType: 'purchaseOrder', label: 'PO-55310 - Halden Steel' })
    ).toBe('PO-55310');
  });

  test('a deleted record says so instead of showing an id', () => {
    expect(taskRecordChipText({ entityType: 'project', label: null })).toBe('Deleted project');
    expect(taskRecordChipText({ entityType: 'rfq', label: undefined })).toBe('Deleted rfq');
  });

  test('the hover names the type and the whole label', () => {
    expect(taskRecordChipTitle({ entityType: 'project', label: '30000 - PS 082K' })).toBe(
      'Project · 30000 - PS 082K'
    );
  });
});

describe('the chips shown', () => {
  test('two, and the rest fold into +N', () => {
    const { shown, hidden } = splitTaskRecordChips(['a', 'b', 'c', 'd']);
    expect(shown).toEqual(['a', 'b']);
    expect(hidden).toEqual(['c', 'd']);
  });

  test('no +N when everything fits', () => {
    expect(splitTaskRecordChips(['a', 'b']).hidden).toEqual([]);
  });

  test('a record keeps one colour everywhere', () => {
    expect(taskRecordChipColor('EN5KDDDH')).toBe(taskRecordChipColor('EN5KDDDH'));
  });

  test('different records spread across the palette', () => {
    const ids = ['EN5KDDDH', '3TM7AIVT', 'CWBWVES3', 'BRIRTWX8', 'Vw44resv', 'iESHvOMc'];
    expect(new Set(ids.map(taskRecordChipColor)).size).toBeGreaterThan(2);
  });
});
