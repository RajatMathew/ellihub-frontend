import Decimal from 'decimal.js';

export type CommercialDecimalAmountLike = string | number | Decimal | null | undefined;

export type CommercialLineAmountLike = {
  quantity?: CommercialDecimalAmountLike;
  qty?: CommercialDecimalAmountLike;
  unitPrice?: CommercialDecimalAmountLike;
  amount?: CommercialDecimalAmountLike;
};

export type CommercialDocumentTotalsInput = {
  lineItems?: CommercialLineAmountLike[];
  subtotal?: CommercialDecimalAmountLike;
  amount?: CommercialDecimalAmountLike;
  negotiatedDiscount?: CommercialDecimalAmountLike;
  shippingHandlingFee?: CommercialDecimalAmountLike;
  taxPercent?: CommercialDecimalAmountLike;
};

export type RFQFinancialDeliverableLike = {
  quantity?: CommercialDecimalAmountLike;
  estimatedUnitPrice?: CommercialDecimalAmountLike;
  estimatedTotal?: CommercialDecimalAmountLike;
};

export type RFQFinancialQuoteLike = {
  grandTotal?: CommercialDecimalAmountLike;
  totalAmount?: CommercialDecimalAmountLike;
};

const ZERO = new Decimal(0);

export function toCommercialDecimal(value: CommercialDecimalAmountLike): Decimal {
  if (value instanceof Decimal) return value;
  if (value == null) return ZERO;
  if (typeof value === 'number' && !Number.isFinite(value)) return ZERO;
  if (typeof value === 'string' && value.trim() === '') return ZERO;

  try {
    return new Decimal(value);
  } catch {
    return ZERO;
  }
}

export function roundMoneyDecimal(value: CommercialDecimalAmountLike): Decimal {
  return toCommercialDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function toMoneyNumber(value: CommercialDecimalAmountLike): number {
  return roundMoneyDecimal(value).toNumber();
}

export function nonNegativeDecimal(value: CommercialDecimalAmountLike): Decimal {
  const decimal = toCommercialDecimal(value);
  return decimal.isNegative() ? ZERO : decimal;
}

export function calculateRoundedLineAmountDecimal(item: CommercialLineAmountLike): Decimal {
  const hasUnitCalculation = (item.quantity != null || item.qty != null) && item.unitPrice != null;

  if (!hasUnitCalculation) return roundMoneyDecimal(item.amount);

  const quantity = toCommercialDecimal(item.quantity ?? item.qty);
  const unitPrice = toCommercialDecimal(item.unitPrice);
  return roundMoneyDecimal(quantity.mul(unitPrice));
}

export function sumRoundedLineAmountsDecimal(lineItems: CommercialLineAmountLike[]): Decimal {
  return roundMoneyDecimal(
    lineItems.reduce(
      (sum, item) => sum.plus(calculateRoundedLineAmountDecimal(item)),
      ZERO
    )
  );
}

export function calculateCommercialDocumentTotalsDecimal({
  lineItems,
  subtotal,
  amount,
  negotiatedDiscount,
  shippingHandlingFee,
  taxPercent,
}: CommercialDocumentTotalsInput) {
  const hasLineItems = lineItems != null && lineItems.length > 0;
  const calculatedSubtotal = hasLineItems
    ? sumRoundedLineAmountsDecimal(lineItems)
    : roundMoneyDecimal(subtotal ?? amount);

  const roundedDiscount = nonNegativeDecimal(roundMoneyDecimal(negotiatedDiscount));
  const discount = roundedDiscount.greaterThan(calculatedSubtotal)
    ? calculatedSubtotal
    : roundedDiscount;
  const shippingHandling = nonNegativeDecimal(roundMoneyDecimal(shippingHandlingFee));
  const taxableAmount = roundMoneyDecimal(
    calculatedSubtotal.minus(discount).plus(shippingHandling)
  );
  const taxRate = nonNegativeDecimal(toCommercialDecimal(taxPercent));
  const taxAmount = roundMoneyDecimal(taxableAmount.mul(taxRate).div(100));

  return {
    subtotal: calculatedSubtotal,
    negotiatedDiscount: discount,
    shippingHandlingFee: shippingHandling,
    taxableAmount,
    taxAmount,
    total: roundMoneyDecimal(taxableAmount.plus(taxAmount)),
  };
}

export function calculateRFQFinancialSummary({
  deliverables,
  quotes,
}: {
  deliverables: RFQFinancialDeliverableLike[];
  quotes: RFQFinancialQuoteLike[];
}) {
  const deliverablesTotal = roundMoneyDecimal(
    deliverables.reduce((sum, deliverable) => {
      const lineAmount =
        deliverable.estimatedTotal != null
          ? roundMoneyDecimal(deliverable.estimatedTotal)
          : calculateRoundedLineAmountDecimal({
              quantity: deliverable.quantity,
              unitPrice: deliverable.estimatedUnitPrice,
            });

      return sum.plus(lineAmount);
    }, ZERO)
  );

  const quoteTotals = quotes
    .map((quote) => quote.grandTotal ?? quote.totalAmount)
    .filter((value): value is Exclude<CommercialDecimalAmountLike, null | undefined> => value != null)
    .map(roundMoneyDecimal)
    .sort((a, b) => a.comparedTo(b));

  const quoteCount = quoteTotals.length;
  const averageQuote =
    quoteCount > 0
      ? roundMoneyDecimal(quoteTotals.reduce((sum, value) => sum.plus(value), ZERO).div(quoteCount))
      : null;
  const medianQuote =
    quoteCount === 0
      ? null
      : quoteCount % 2 === 1
        ? quoteTotals[Math.floor(quoteCount / 2)]
        : roundMoneyDecimal(
            quoteTotals[quoteCount / 2 - 1].plus(quoteTotals[quoteCount / 2]).div(2)
          );

  return {
    deliverablesTotal: deliverablesTotal.toNumber(),
    lowestQuote: quoteTotals[0]?.toNumber() ?? null,
    highestQuote: quoteTotals[quoteCount - 1]?.toNumber() ?? null,
    averageQuote: averageQuote?.toNumber() ?? null,
    medianQuote: medianQuote?.toNumber() ?? null,
  };
}
