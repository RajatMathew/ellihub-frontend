import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const InvoiceCreateSchema = z.object({
    projectId: nanoIdSchema,
    vendorId: nanoIdSchema,
    purchaseOrderId: nanoIdSchema.optional().nullable(),
    invoiceNumber: z.string().min(1),
    invoiceDate: z.iso.date(),
    dueDate: z.iso.date(),
    totalAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative().optional().nullable(),
    taxRate: z.number().nonnegative().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    relatedSCOIds: z.array(nanoIdSchema).default([]),
    attachments: z.array(nanoIdSchema).min(1, 'At least one attachment is required'),
});

export type InvoiceCreateRequest = z.infer<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = InvoiceCreateSchema.omit({ attachments: true }).extend({
    id: nanoIdSchema,
});

export type InvoiceUpdateRequest = z.infer<typeof InvoiceUpdateSchema>;

export const AddInvoiceAttachmentSchema = z.object({
    invoiceId: nanoIdSchema,
    documentId: nanoIdSchema,
});

export type AddInvoiceAttachmentRequest = z.infer<typeof AddInvoiceAttachmentSchema>;

export const RemoveInvoiceAttachmentSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveInvoiceAttachmentRequest = z.infer<typeof RemoveInvoiceAttachmentSchema>;

export const MarkInvoicePaidSchema = z.object({
    id: nanoIdSchema,
    paidDate: z.iso.date(),
    paymentMethodId: nanoIdSchema,
    paymentReference: z.string().min(1).optional().nullable(),
    paymentNotes: z.string().min(1).optional().nullable(),
});

export type MarkInvoicePaidRequest = z.infer<typeof MarkInvoicePaidSchema>;

export const MarkInvoiceUnpaidSchema = z.object({
    id: nanoIdSchema,
});

export type MarkInvoiceUnpaidRequest = z.infer<typeof MarkInvoiceUnpaidSchema>;

export const DisputeInvoiceSchema = z.object({
    id: nanoIdSchema,
    disputeReason: z.string().min(1),
});

export type DisputeInvoiceRequest = z.infer<typeof DisputeInvoiceSchema>;

export const ResolveInvoiceDisputeSchema = z.object({
    id: nanoIdSchema,
});

export type ResolveInvoiceDisputeRequest = z.infer<typeof ResolveInvoiceDisputeSchema>;
