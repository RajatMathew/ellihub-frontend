import z from 'zod';

export const RevisionEntityTypeSchema = z.enum([
    'RFQ',
    'PURCHASE_ORDER',
    'SUB_CHANGE_ORDER',
    'INVOICE',
    'PROJECT',
]);

export type RevisionEntityTypeValue = z.infer<typeof RevisionEntityTypeSchema>;
