import { Prisma } from '@db/client';
import { BadRequestError } from '@utils';

export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculateCommercialDocumentTotals({
    lineAmounts,
    negotiatedDiscount,
    shippingHandlingFee,
    taxPercent,
}: {
    lineAmounts: Prisma.Decimal[];
    negotiatedDiscount?: number | null;
    shippingHandlingFee?: number | null;
    taxPercent?: number | null;
}) {
    const subtotal = lineAmounts.reduce(
        (sum, amount) => sum.plus(roundMoney(amount)),
        new Prisma.Decimal(0)
    );
    const discount = roundMoney(new Prisma.Decimal(negotiatedDiscount ?? 0));
    if (discount.greaterThan(subtotal)) {
        throw new BadRequestError('Negotiated discount cannot exceed subtotal');
    }

    const shippingHandling = roundMoney(new Prisma.Decimal(shippingHandlingFee ?? 0));
    const taxableAmount = roundMoney(subtotal.minus(discount).plus(shippingHandling));
    const taxAmount =
        taxPercent != null
            ? roundMoney(taxableAmount.times(new Prisma.Decimal(taxPercent)).dividedBy(100))
            : new Prisma.Decimal(0);
    const total = roundMoney(taxableAmount.plus(taxAmount));

    return {
        subtotal,
        negotiatedDiscount: discount,
        shippingHandling,
        taxableAmount,
        taxAmount,
        total,
    };
}
