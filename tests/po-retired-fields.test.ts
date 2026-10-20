import { describe, expect, test } from 'bun:test';

import { toCreatePoInput, type CreatePoRecordAction } from '../src/mock/record-actions';
import { getStoredRetainagePercent } from '../src/modules/project/lib/purchase-order-retainage';
import {
  createPOInputSchema,
  poDetailSchema,
} from '../src/modules/project/schemas/purchase-order/purchase-order.schema';

// The PO description is retired: the client no longer collects or sends it,
// and still parses a response from an API that has the column (release 1) or
// has dropped it (release 2). Retainage is only hidden: no field shows it, but
// an edit sends the stored value back so the API never resets it.

const lineItem = {
  description: 'White oak material package',
  quantity: 2,
  unitId: 'unit0001',
  unitPrice: 100,
  costCodeId: 'cost0001',
};

describe('retired purchase order fields', () => {
  test('the PO form payload never carries a description', () => {
    const parsed = createPOInputSchema.parse({
      projectId: 'proj0001',
      vendorId: 'vend0001',
      tradeCategoryId: 'trad0001',
      paymentTerms: 'NET_30',
      lineItems: [lineItem],
      description: 'Millwork package',
      retainagePercent: 10,
    });

    expect(parsed).not.toHaveProperty('description');
    expect(parsed.lineItems[0]?.description).toBe('White oak material package');
  });

  test('the PO form payload still carries the hidden retainage', () => {
    const parsed = createPOInputSchema.parse({
      projectId: 'proj0001',
      vendorId: 'vend0001',
      tradeCategoryId: 'trad0001',
      paymentTerms: 'NET_30',
      lineItems: [lineItem],
      retainagePercent: 7.5,
    });

    expect(parsed.retainagePercent).toBe(7.5);
  });

  test("Elliot's PO proposal does not send a description", () => {
    const action = {
      action: 'create_po',
      projectId: 'proj0001',
      projectName: 'Harbor Point',
      vendorId: 'vend0001',
      vendorName: 'Atlantic Plywood',
      tradeCategoryId: 'trad0001',
      tradeCategoryLabel: 'Carpentry',
      paymentTerms: 'NET_30',
      description: 'Left over from an older proposal',
      lineItems: [lineItem],
      summary: 'Create a PO',
    } as CreatePoRecordAction;

    expect(toCreatePoInput(action)).not.toHaveProperty('description');
  });

  test('a PO detail parses with or without the retired columns', () => {
    const base = {
      id: 'po000001',
      projectId: 'proj0001',
      vendorId: 'vend0001',
      status: { id: 'DRAFT', name: 'DRAFT', label: 'Draft', color: 'gray' },
    };

    expect(poDetailSchema.safeParse(base).success).toBe(true);
    expect(
      poDetailSchema.safeParse({ ...base, description: null, retainagePercent: '0.000' }).success
    ).toBe(true);
  });
});

describe('hidden PO retainage on edit', () => {
  test('sends back exactly what is stored, including 0', () => {
    expect(getStoredRetainagePercent('7.500')).toBe(7.5);
    expect(getStoredRetainagePercent('0.000')).toBe(0);
  });

  test('a PO with none stored sends none', () => {
    expect(getStoredRetainagePercent(null)).toBeUndefined();
    expect(getStoredRetainagePercent(undefined)).toBeUndefined();
    expect(getStoredRetainagePercent('')).toBeUndefined();
  });
});
