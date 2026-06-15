import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

export type VendorCommitmentSummary = {
  totalCommitted: number;
  purchaseOrderCount: number;
};

export function getPurchaseOrderTotalCommitment(purchaseOrder: POListItem) {
  if (purchaseOrder.status === 'CANCELLED') return 0;

  const purchaseOrderTotal = Number(purchaseOrder.total ?? 0);
  const approvedSubChangeOrderTotal = (purchaseOrder.subChangeOrders ?? [])
    .filter((subChangeOrder) => subChangeOrder.status === 'APPROVED')
    .reduce((sum, subChangeOrder) => sum + getSubChangeOrderTotalAmount(subChangeOrder), 0);

  return purchaseOrderTotal + approvedSubChangeOrderTotal;
}

export function getVendorCommitmentSummaries(purchaseOrders: POListItem[]) {
  const summaries = new Map<string, VendorCommitmentSummary>();

  for (const purchaseOrder of purchaseOrders) {
    if (purchaseOrder.status === 'CANCELLED') continue;

    const existing = summaries.get(purchaseOrder.vendorId) ?? {
      totalCommitted: 0,
      purchaseOrderCount: 0,
    };

    summaries.set(purchaseOrder.vendorId, {
      totalCommitted: existing.totalCommitted + getPurchaseOrderTotalCommitment(purchaseOrder),
      purchaseOrderCount: existing.purchaseOrderCount + 1,
    });
  }

  return summaries;
}
