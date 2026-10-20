import { describe, expect, test } from 'bun:test';

import type { CreateScoRecordAction } from '../src/mock/record-actions';
import { withChangeType, withPurchaseOrder } from '../src/mock/record-sco-edits';

/**
 * elli-ui#1485 — the PO, vendor and change type on Elliot's change order card could not be
 * changed. The PO and change type are now picked, and the vendor follows the PO.
 */

const action = {
  action: 'create_sco',
  summary: 'Log the $12 delivery fee',
  projectId: 'p1',
  purchaseOrderId: 'po-1',
  poNumber: '25702',
  vendorName: 'Abbot Paint and Varnish',
  date: '2026-10-15',
  title: 'Delivery fee',
  changeTypeId: 'ct-other',
  changeTypeLabel: 'Other',
  lineItems: [],
} as unknown as CreateScoRecordAction;

describe('correcting Elliot’s change order', () => {
  test('another PO brings its own vendor', () => {
    const next = withPurchaseOrder(action, {
      id: 'po-2',
      poNumber: '25810',
      vendorName: 'Halden Steel',
    });
    expect(next).toMatchObject({
      purchaseOrderId: 'po-2',
      poNumber: '25810',
      vendorName: 'Halden Steel',
    });
    // Nothing else on the card moves.
    expect(next.title).toBe('Delivery fee');
    expect(next.changeTypeId).toBe('ct-other');
  });

  test('a PO with no number shows its id rather than nothing', () => {
    expect(
      withPurchaseOrder(action, { id: 'po-3', poNumber: null, vendorName: null })
    ).toMatchObject({ poNumber: 'po-3', vendorName: '' });
  });

  test('the change type keeps its id and its label together', () => {
    expect(withChangeType(action, { id: 'ct-scope', label: 'Scope change' })).toMatchObject({
      changeTypeId: 'ct-scope',
      changeTypeLabel: 'Scope change',
      purchaseOrderId: 'po-1',
    });
  });
});
