import { generatePoNumber } from './utils';

export { generatePoNumber };

export const PO_NUMBER_PREFIX = 'PO-';
const MIN_PO_NUMBER_SUFFIX_WIDTH = 3;
const PO_NUMBER_SUFFIX_INPUT_PATTERN = /^(?:PO-)?\d+$/i;

export function getPoNumberSuffix(poNumber: string | null | undefined): string {
    const trimmed = String(poNumber ?? '').trim();
    return trimmed.replace(/^PO-/i, '');
}

export function normalizePoNumberSuffixInput(value: string | null | undefined): string | null {
    const trimmed = String(value ?? '').trim();
    if (!trimmed || !PO_NUMBER_SUFFIX_INPUT_PATTERN.test(trimmed)) return null;

    const suffix = getPoNumberSuffix(trimmed).replace(/^0+/, '');
    if (!suffix) return null;

    return suffix.padStart(MIN_PO_NUMBER_SUFFIX_WIDTH, '0');
}

export function formatPoNumberFromSuffix(value: string | null | undefined): string | null {
    const suffix = normalizePoNumberSuffixInput(value);
    return suffix ? `${PO_NUMBER_PREFIX}${suffix}` : null;
}
