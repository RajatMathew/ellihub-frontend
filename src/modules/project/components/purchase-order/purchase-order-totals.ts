import { formatPercent } from '@/app/lib/helpers';

type PurchaseOrderAmountLike = string | number | null | undefined;

export type PurchaseOrderLineAmountLike = {
  quantity?: PurchaseOrderAmountLike;
  qty?: PurchaseOrderAmountLike;
  unitPrice?: PurchaseOrderAmountLike;
  amount?: PurchaseOrderAmountLike;
};

export type PurchaseOrderTotalsInput = {
  lineItems?: PurchaseOrderLineAmountLike[];
  subtotal?: PurchaseOrderAmountLike;
  amount?: PurchaseOrderAmountLike;
  negotiatedDiscount?: PurchaseOrderAmountLike;
  shippingHandlingFee?: PurchaseOrderAmountLike;
  taxPercent?: PurchaseOrderAmountLike;
  taxAmount?: PurchaseOrderAmountLike;
};

function toNumber(value: PurchaseOrderAmountLike) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function roundMoney(value: PurchaseOrderAmountLike) {
  const numericValue = toNumber(value);
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
}

export function calculateRoundedLineAmount(item: PurchaseOrderLineAmountLike) {
  const quantity = toNumber(item.quantity ?? item.qty);
  const unitPrice = toNumber(item.unitPrice);
  const hasUnitCalculation = (item.quantity != null || item.qty != null) && item.unitPrice != null;

  return hasUnitCalculation ? roundMoney(quantity * unitPrice) : roundMoney(item.amount);
}

export function calculatePurchaseOrderTotals({
  lineItems,
  subtotal,
  amount,
  negotiatedDiscount,
  shippingHandlingFee,
  taxPercent,
}: PurchaseOrderTotalsInput) {
  const hasLineItems = lineItems != null && lineItems.length > 0;
  const calculatedSubtotal =
    hasLineItems
      ? lineItems.reduce((sum, item) => {
          return roundMoney(sum + calculateRoundedLineAmount(item));
        }, 0)
      : roundMoney(subtotal ?? amount);

  const discount = Math.min(Math.max(roundMoney(negotiatedDiscount), 0), calculatedSubtotal);
  const shippingHandling = Math.max(roundMoney(shippingHandlingFee), 0);
  const taxableAmount = roundMoney(calculatedSubtotal - discount + shippingHandling);
  const taxRate = Math.max(toNumber(taxPercent), 0);
  const taxAmount = roundMoney((taxableAmount * taxRate) / 100);

  return {
    subtotal: calculatedSubtotal,
    negotiatedDiscount: discount,
    shippingHandlingFee: shippingHandling,
    taxableAmount,
    taxAmount,
    total: roundMoney(taxableAmount + taxAmount),
  };
}

export function calculateEffectivePurchaseOrderTotals(input: PurchaseOrderTotalsInput) {
  const totals = calculatePurchaseOrderTotals({
    ...input,
    subtotal: input.subtotal ?? input.amount,
  });
  const storedTaxAmount = input.taxAmount == null ? null : roundMoney(input.taxAmount);
  const taxAmount = storedTaxAmount ?? totals.taxAmount;

  return {
    ...totals,
    taxAmount,
    total: roundMoney(totals.taxableAmount + taxAmount),
  };
}

export function formatPurchaseOrderTaxLabel(taxPercent: PurchaseOrderAmountLike) {
  const numericTaxPercent = toNumber(taxPercent);
  return numericTaxPercent !== 0 ? `Tax (${formatPercent(numericTaxPercent)})` : 'Tax';
}
