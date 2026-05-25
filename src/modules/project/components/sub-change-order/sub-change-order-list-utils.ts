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

type SubChangeOrderAmountLike = {
  amount?: string | number | null;
  shippingHandlingFee?: string | number | null;
};

export function getSubChangeOrderSubtotal(sco: Pick<SubChangeOrderAmountLike, 'amount'>) {
  const subtotal = Number(sco.amount ?? 0);
  return Number.isFinite(subtotal) ? subtotal : 0;
}

export function getSubChangeOrderShippingHandlingFee(
  sco: Pick<SubChangeOrderAmountLike, 'shippingHandlingFee'>
) {
  const fee = Number(sco.shippingHandlingFee ?? 0);
  return Number.isFinite(fee) ? fee : 0;
}

export function getSubChangeOrderTotalAmount(sco: SubChangeOrderAmountLike) {
  return getSubChangeOrderSubtotal(sco) + getSubChangeOrderShippingHandlingFee(sco);
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
