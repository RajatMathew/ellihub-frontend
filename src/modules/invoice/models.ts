import z from 'zod';

export const InvoiceCreateSchema = z.object({
    projectId: z.ulid(),
    vendorId: z.ulid(),
    purchaseOrderId: z.ulid().optional().nullable(),
    invoiceNumber: z.string().min(1),
    invoiceDate: z.iso.date(),
    dueDate: z.iso.date(),
    totalAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative().optional().nullable(),
    taxRate: z.number().nonnegative().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    relatedSCOIds: z.array(z.ulid()).default([]),
    attachments: z.array(z.ulid()).min(1, 'At least one attachment is required'),
});

export type InvoiceCreateRequest = z.infer<typeof InvoiceCreateSchema>;
