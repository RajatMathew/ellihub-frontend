import { POLineItemSchema } from '@modules/po/models';
import { RfqDeliverableSchema, SubmitQuoteSchema } from '@modules/rfq/models';
import { SCOLineItemSchema } from '@modules/sco/models';
import { describe, expect, test } from 'bun:test';

const id = 'ABC123xy';

describe('commercial decimal input schemas', () => {
    test('accepts decimal PO line item quantity and unit price', () => {
        expect(
            POLineItemSchema.safeParse({
                description: 'Framing labor',
                unitId: id,
                quantity: 12.75,
                unitPrice: 83.335,
                costCodeId: id,
            }).success
        ).toBe(true);
    });

    test('accepts decimal SCO line item quantity and unit price', () => {
        expect(
            SCOLineItemSchema.safeParse({
                description: 'Added blocking',
                quantity: 2.25,
                unitId: id,
                unitPrice: 155.555,
                costCodeId: id,
            }).success
        ).toBe(true);
    });

    test('accepts decimal RFQ deliverable quantity and quoted amount', () => {
        expect(
            RfqDeliverableSchema.safeParse({
                name: 'Concrete patching',
                unitId: id,
                quantity: 4.5,
                costCodeId: id,
            }).success
        ).toBe(true);

        expect(
            SubmitQuoteSchema.safeParse({
                id,
                quotedAmount: 12345.67,
                leadTime: '14 days',
                attachments: [id],
            }).success
        ).toBe(true);
    });

    test('requires RFQ quote attachments', () => {
        expect(
            SubmitQuoteSchema.safeParse({
                id,
                quotedAmount: 12345.67,
                leadTime: '14 days',
                attachments: [],
            }).success
        ).toBe(false);
    });
    test('rejects values beyond commercial precision policy', () => {
        expect(
            POLineItemSchema.safeParse({
                description: 'Framing labor',
                unitId: id,
                quantity: 12.1234,
                unitPrice: 83.335,
                costCodeId: id,
            }).success
        ).toBe(false);

        expect(
            SCOLineItemSchema.safeParse({
                description: 'Added blocking',
                quantity: 2.25,
                unitId: id,
                unitPrice: 155.5555,
                costCodeId: id,
            }).success
        ).toBe(false);

        expect(
            SubmitQuoteSchema.safeParse({
                id,
                quotedAmount: 12345.678,
                leadTime: '14 days',
                attachments: [id],
            }).success
        ).toBe(false);
    });
});
