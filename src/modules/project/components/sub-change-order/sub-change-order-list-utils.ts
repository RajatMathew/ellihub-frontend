import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';

export function formatOptionalSubChangeOrderDate(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

export function formatOptionalSubChangeOrderCurrency(
  value: string | number | null | undefined,
) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

export function getSubChangeOrderTypeLabel(sco: SCOListItem, fallback?: string) {
  return (
    sco.changeType?.label ??
    sco.changeType?.name ??
    sco.changeType?.code ??
    fallback ??
    '-'
  );
}

export function getSubChangeOrderPurchaseOrderLabel(sco: SCOListItem) {
  return sco.purchaseOrder?.poNumber ?? sco.purchaseOrderId ?? '-';
}
