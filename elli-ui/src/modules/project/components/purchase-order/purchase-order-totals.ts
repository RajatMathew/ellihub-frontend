import { formatPercent } from '@/app/lib/helpers';
import {
  calculateCommercialDocumentTotalsDecimal,
  calculateRoundedLineAmountDecimal,
  roundMoneyDecimal,
  toMoneyNumber,
} from '@/modules/project/lib/commercial-decimal';

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

export function toNumber(value: PurchaseOrderAmountLike) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function roundMoney(value: PurchaseOrderAmountLike) {
  return toMoneyNumber(value);
}

export function calculateRoundedLineAmount(item: PurchaseOrderLineAmountLike) {
  return calculateRoundedLineAmountDecimal(item).toNumber();
}

export function calculatePurchaseOrderTotalsDecimal({
  lineItems,
  subtotal,
  amount,
  negotiatedDiscount,
  shippingHandlingFee,
  taxPercent,
}: PurchaseOrderTotalsInput) {
  return calculateCommercialDocumentTotalsDecimal({
    lineItems,
    subtotal,
    amount,
    negotiatedDiscount,
    shippingHandlingFee,
    taxPercent,
  });
}

export function calculatePurchaseOrderTotals(input: PurchaseOrderTotalsInput) {
  const totals = calculatePurchaseOrderTotalsDecimal(input);

  return {
    subtotal: totals.subtotal.toNumber(),
    negotiatedDiscount: totals.negotiatedDiscount.toNumber(),
    shippingHandlingFee: totals.shippingHandlingFee.toNumber(),
    taxableAmount: totals.taxableAmount.toNumber(),
    taxAmount: totals.taxAmount.toNumber(),
    total: totals.total.toNumber(),
  };
}

export function calculateEffectivePurchaseOrderTotals(input: PurchaseOrderTotalsInput) {
  const totals = calculatePurchaseOrderTotalsDecimal({
    ...input,
    subtotal: input.subtotal ?? input.amount,
  });
  const storedTaxAmount = input.taxAmount == null ? null : roundMoneyDecimal(input.taxAmount);
  const taxAmount = storedTaxAmount ?? totals.taxAmount;

  return {
    subtotal: totals.subtotal.toNumber(),
    negotiatedDiscount: totals.negotiatedDiscount.toNumber(),
    shippingHandlingFee: totals.shippingHandlingFee.toNumber(),
    taxableAmount: totals.taxableAmount.toNumber(),
    taxAmount: taxAmount.toNumber(),
    total: roundMoneyDecimal(totals.taxableAmount.plus(taxAmount)).toNumber(),
  };
}

export function formatPurchaseOrderTaxLabel(taxPercent: PurchaseOrderAmountLike) {
  const numericTaxPercent = toNumber(taxPercent);
  return numericTaxPercent !== 0 ? `Tax (${formatPercent(numericTaxPercent)})` : 'Tax';
}
