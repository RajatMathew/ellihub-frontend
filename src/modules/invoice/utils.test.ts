import { describe, expect, test } from 'bun:test';

import { generateInvoiceNumber } from './utils';

function makeTx(existingInvoiceNumbers: string[]) {
    return {
        invoice: {
            findMany: async () =>
                existingInvoiceNumbers.map((invoiceNumber) => ({ invoiceNumber })),
            findFirst: async ({ where }: { where: { invoiceNumber: string } }) =>
                existingInvoiceNumbers.includes(where.invoiceNumber) ? { id: 'existing' } : null,
        },
    } as never;
}

describe('generateInvoiceNumber', () => {
    test('starts invoice sequence for a purchase order', async () => {
        await expect(generateInvoiceNumber(makeTx([]), 'po-006', 'PO-006')).resolves.toBe(
            'PO-006-INV-001'
        );
    });

    test('increments invoice sequence within the same purchase order', async () => {
        await expect(
            generateInvoiceNumber(makeTx(['PO-006-INV-001']), 'po-006', 'PO-006')
        ).resolves.toBe('PO-006-INV-002');
    });

    test('uses a separate sequence for another purchase order', async () => {
        await expect(generateInvoiceNumber(makeTx([]), 'po-007', 'PO-007')).resolves.toBe(
            'PO-007-INV-001'
        );
    });
});
