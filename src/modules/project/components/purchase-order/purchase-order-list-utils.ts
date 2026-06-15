import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

export function formatOptionalPurchaseOrderDate(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

export function formatPurchaseOrderPaymentTerms(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : '-';
}

export function formatOptionalPurchaseOrderCurrency(
  value: string | number | null | undefined,
) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

export function getPurchaseOrderVendorName(po: POListItem) {
  return po.vendor?.name || '-';
}

export function getPurchaseOrderRfqLabel(po: POListItem) {
  return po.rfq?.rfqNumber || po.rfq?.title || null;
}

export function getPurchaseOrderTradeCategoryLabel(po: POListItem, fallback?: string) {
  return po.tradeCategory?.label ?? po.tradeCategory?.name ?? fallback ?? '-';
}
