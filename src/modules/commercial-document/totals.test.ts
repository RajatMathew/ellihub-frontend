import { Prisma } from '@db/client';
import { describe, expect, test } from 'bun:test';

import {
    calculateCommercialDocumentTotals,
    calculateCommercialLineAmount,
    calculateSubChangeOrderTotal,
    roundMoney,
} from './totals';

const decimalString = (value: Prisma.Decimal) => value.toFixed(2);

describe('commercial document decimal totals', () => {
    test('rounds monetary decimals half up instead of using floating point math', () => {
        expect(decimalString(roundMoney(new Prisma.Decimal('1.005')))).toBe('1.01');
        expect(decimalString(roundMoney(new Prisma.Decimal('2.675')))).toBe('2.68');
    });

    test('calculates line item amounts from decimal quantity and unit price', () => {
        const amount = calculateCommercialLineAmount({
            quantity: '2.55',
            unitPrice: '19.995',
        });

        expect(decimalString(amount)).toBe('50.99');
    });

    test('calculates PO-style subtotal, discount, shipping, tax, and total with decimals', () => {
        const lineAmounts = [
            calculateCommercialLineAmount({ quantity: '1.005', unitPrice: '1' }),
            calculateCommercialLineAmount({ quantity: '2', unitPrice: '3.333' }),
        ];

        const totals = calculateCommercialDocumentTotals({
            lineAmounts,
            negotiatedDiscount: 0.335,
            shippingHandlingFee: 1.005,
            taxPercent: 8.875,
        });

        expect(decimalString(totals.subtotal)).toBe('7.68');
        expect(decimalString(totals.negotiatedDiscount)).toBe('0.34');
        expect(decimalString(totals.shippingHandling)).toBe('1.01');
        expect(decimalString(totals.taxableAmount)).toBe('8.35');
        expect(decimalString(totals.taxAmount)).toBe('0.74');
        expect(decimalString(totals.total)).toBe('9.09');
    });

    test('rejects a negotiated discount larger than the rounded subtotal', () => {
        expect(() =>
            calculateCommercialDocumentTotals({
                lineAmounts: [calculateCommercialLineAmount({ quantity: '1', unitPrice: '10' })],
                negotiatedDiscount: 10.01,
            })
        ).toThrow('Negotiated discount cannot exceed subtotal');
    });

    test('calculates SCO amount from rounded line subtotal while preserving total fields', () => {
        const totals = calculateSubChangeOrderTotal({
            lineAmounts: [
                calculateCommercialLineAmount({ quantity: '3.25', unitPrice: '12.347' }),
                calculateCommercialLineAmount({ quantity: '1.10', unitPrice: '2.005' }),
            ],
            negotiatedDiscount: 1.115,
            shippingHandlingFee: 0.335,
            taxPercent: 7.25,
        });

        expect(decimalString(totals.amount)).toBe('42.34');
        expect(decimalString(totals.negotiatedDiscount)).toBe('1.12');
        expect(decimalString(totals.shippingHandling)).toBe('0.34');
        expect(decimalString(totals.taxAmount)).toBe('3.01');
        expect(decimalString(totals.total)).toBe('44.57');
    });
});
