import type { CreateScoRecordAction } from './record-actions';

/**
 * Corrections a person makes to Elliot's change order before approving it (elli-ui#1485).
 *
 * The PO and the change type were shown read-only, so a change order Elliot pinned on the wrong
 * PO, or filed as "Other", could only be rejected. The vendor is not chosen on its own: a sub
 * change order is against a PO, and its vendor is that PO's — picking a PO brings its vendor.
 */

export function withPurchaseOrder(
  action: CreateScoRecordAction,
  po: { id: string; poNumber: string | null; vendorName: string | null }
): CreateScoRecordAction {
  return {
    ...action,
    purchaseOrderId: po.id,
    poNumber: po.poNumber ?? po.id,
    vendorName: po.vendorName ?? '',
  };
}

export function withChangeType(
  action: CreateScoRecordAction,
  changeType: { id: string; label: string }
): CreateScoRecordAction {
  return { ...action, changeTypeId: changeType.id, changeTypeLabel: changeType.label };
}
