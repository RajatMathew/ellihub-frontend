import { describe, expect, test } from 'bun:test';

import { formatUnitPrice } from '../src/app/lib/helpers';
import {
  findDefaultLineItemUnitId,
  findLinesWithoutUnit,
} from '../src/modules/project/lib/line-item-defaults';
import { poLineItemInputSchema } from '../src/modules/project/schemas/purchase-order';
import { scoLineItemInputSchema } from '../src/modules/project/schemas/sub-change-order';

/**
 * Vendors quote unit prices to four places. A PO held to fewer did not total
 * to the quote, so its numbers and the vendor's disagreed.
 */
const poLine = {
  description: 'Framing labor',
  quantity: 10,
  unitId: 'unit-each',
  costCodeId: 'cost-code',
};
const scoLine = { description: 'Added blocking', quantity: 2, unitId: 'unit-each' };

describe('a PO or SCO line unit price', () => {
  test('takes four decimal places, as vendors quote it', () => {
    expect(poLineItemInputSchema.safeParse({ ...poLine, unitPrice: 4.8507 }).success).toBe(true);
    expect(scoLineItemInputSchema.safeParse({ ...scoLine, unitPrice: 4.8507 }).success).toBe(true);
  });

  test('refuses a fifth', () => {
    expect(poLineItemInputSchema.safeParse({ ...poLine, unitPrice: 4.85071 }).success).toBe(false);
    expect(scoLineItemInputSchema.safeParse({ ...scoLine, unitPrice: 4.85071 }).success).toBe(
      false
    );
  });

  test('must be entered: a blank one is required, not a free line', () => {
    const result = poLineItemInputSchema.safeParse({ ...poLine, unitPrice: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Unit price is required');
    expect(scoLineItemInputSchema.safeParse({ ...scoLine, unitPrice: undefined }).success).toBe(
      false
    );
  });

  test('may be 0 when that is what was entered', () => {
    expect(poLineItemInputSchema.safeParse({ ...poLine, unitPrice: 0 }).success).toBe(true);
  });

  test('shows every place it has, and never fewer than cents', () => {
    expect(formatUnitPrice('4.8507')).toBe('$4.8507');
    expect(formatUnitPrice('4.8500')).toBe('$4.85');
    expect(formatUnitPrice(12)).toBe('$12.00');
    expect(formatUnitPrice('1234.5')).toBe('$1,234.50');
    expect(formatUnitPrice(null)).toBe('$0.00');
  });
});

describe('a new line unit', () => {
  const units = [
    { id: 'unit-ft', label: 'Linear Foot' },
    { id: 'unit-each', label: 'EACH' },
  ];

  test('is EACH, found by label since its id differs per environment', () => {
    expect(findDefaultLineItemUnitId(units)).toBe('unit-each');
    expect(findDefaultLineItemUnitId([{ id: 'u', label: ' each ' }])).toBe('u');
  });

  test('is left alone when there is no EACH unit, or the units have not loaded', () => {
    expect(findDefaultLineItemUnitId([{ id: 'unit-ft', label: 'Linear Foot' }])).toBeUndefined();
    expect(findDefaultLineItemUnitId(undefined)).toBeUndefined();
  });

  test('fills only lines with no unit chosen, never one that has one', () => {
    expect(
      findLinesWithoutUnit([{ unitId: 'unit-ft' }, { unitId: '' }, { unitId: null }, {}])
    ).toEqual([1, 2, 3]);
    expect(findLinesWithoutUnit(undefined)).toEqual([]);
  });
});
