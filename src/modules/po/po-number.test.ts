import { describe, expect, test } from 'bun:test';

import {
    formatPoNumberFromSuffix,
    generatePoNumber,
    getPoNumberSuffix,
    normalizePoNumberSuffixInput,
} from './po-number';

function makeTx(existingPoNumbers: string[]) {
    return {
        purchaseOrder: {
            findMany: async () => existingPoNumbers.map((poNumber) => ({ poNumber })),
            findUnique: async ({ where }: { where: { poNumber: string } }) =>
                existingPoNumbers.includes(where.poNumber) ? { id: 'existing' } : null,
        },
    } as never;
}

describe('PO number helpers', () => {
    test('normalizes numeric suffixes behind the fixed PO prefix', () => {
        expect(normalizePoNumberSuffixInput('1')).toBe('001');
        expect(normalizePoNumberSuffixInput('001')).toBe('001');
        expect(normalizePoNumberSuffixInput('PO-1001')).toBe('1001');
        expect(formatPoNumberFromSuffix('1001')).toBe('PO-1001');
        expect(getPoNumberSuffix('PO-1001')).toBe('1001');
    });

    test('rejects empty, zero-only, and nonnumeric suffixes', () => {
        expect(normalizePoNumberSuffixInput('')).toBeNull();
        expect(normalizePoNumberSuffixInput('000')).toBeNull();
        expect(normalizePoNumberSuffixInput('ABC')).toBeNull();
        expect(formatPoNumberFromSuffix('PO-ABC')).toBeNull();
    });

    test('generates the next global numeric PO number', async () => {
        await expect(generatePoNumber(makeTx(['PO-001', 'PO-002']))).resolves.toBe('PO-003');
    });

    test('continues after high manually imported numeric PO numbers', async () => {
        await expect(generatePoNumber(makeTx(['PO-001', 'PO-1001']))).resolves.toBe('PO-1002');
    });
});
