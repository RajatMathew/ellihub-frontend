import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

const InvoiceBaseSchema = z.object({
    projectId: nanoIdSchema,
    vendorId: nanoIdSchema,
    purchaseOrderId: nanoIdSchema,
    externalInvoiceNumber: z.string().trim().optional().nullable(),
    invoiceDate: z.iso.date(),
    dueDate: z.iso.date(),
    totalAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative().optional().nullable(),
    taxRate: z.number().nonnegative().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    relatedSCOIds: z.array(nanoIdSchema).default([]),
});

export const InvoiceCreateSchema = InvoiceBaseSchema.extend({
    vendorCoupon: z.boolean().default(false),
    attachments: z.array(nanoIdSchema).default([]),
}).superRefine((data, ctx) => {
    if (!data.vendorCoupon && data.attachments.length === 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['attachments'],
            message: 'At least one attachment is required',
        });
    }
});

export type InvoiceCreateRequest = z.infer<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = InvoiceBaseSchema.extend({
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
