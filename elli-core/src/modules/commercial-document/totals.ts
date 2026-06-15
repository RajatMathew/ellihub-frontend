import { Prisma } from '@db/client';
import { BadRequestError } from '@utils';
import { Decimal } from 'decimal.js';

type DecimalInput = Prisma.Decimal | Decimal | number | string;

function toDecimal(value: DecimalInput): Decimal {
    return value instanceof Decimal ? value : new Decimal(value.toString());
}

function toPrismaDecimal(value: Decimal): Prisma.Decimal {
    return new Prisma.Decimal(value.toString());
}

export function roundMoney(value: DecimalInput): Prisma.Decimal {
    return toPrismaDecimal(toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
}

export function calculateCommercialLineAmount({
    quantity,
    unitPrice,
}: {
    quantity: DecimalInput;
    unitPrice: DecimalInput;
}): Prisma.Decimal {
    return roundMoney(toDecimal(quantity).times(toDecimal(unitPrice)));
}

export function calculateCommercialDocumentTotals({
    lineAmounts,
    negotiatedDiscount,
    shippingHandlingFee,
    taxPercent,
}: {
    lineAmounts: DecimalInput[];
    negotiatedDiscount?: number | null;
    shippingHandlingFee?: number | null;
    taxPercent?: number | null;
}) {
    const subtotal = lineAmounts.reduce<Decimal>(
        (sum, amount) => sum.plus(toDecimal(roundMoney(amount))),
        new Decimal(0)
    );
    const discount = toDecimal(roundMoney(negotiatedDiscount ?? 0));
    if (discount.greaterThan(subtotal)) {
        throw new BadRequestError('Negotiated discount cannot exceed subtotal');
    }

    const shippingHandling = toDecimal(roundMoney(shippingHandlingFee ?? 0));
    const taxableAmount = toDecimal(roundMoney(subtotal.minus(discount).plus(shippingHandling)));
    const taxAmount =
        taxPercent != null
            ? toDecimal(roundMoney(taxableAmount.times(toDecimal(taxPercent)).dividedBy(100)))
            : new Decimal(0);
    const total = toDecimal(roundMoney(taxableAmount.plus(taxAmount)));

    return {
        subtotal: toPrismaDecimal(subtotal),
        negotiatedDiscount: toPrismaDecimal(discount),
        shippingHandling: toPrismaDecimal(shippingHandling),
        taxableAmount: toPrismaDecimal(taxableAmount),
        taxAmount: toPrismaDecimal(taxAmount),
        total: toPrismaDecimal(total),
    };
}

export function calculateSubChangeOrderTotal({
    lineAmounts,
    negotiatedDiscount,
    shippingHandlingFee,
    taxPercent,
}: {
    lineAmounts: DecimalInput[];
    negotiatedDiscount?: number | null;
    shippingHandlingFee?: number | null;
    taxPercent?: number | null;
}) {
    const totals = calculateCommercialDocumentTotals({
        lineAmounts,
        negotiatedDiscount,
        shippingHandlingFee,
        taxPercent,
    });

    return { ...totals, amount: totals.subtotal };
}
