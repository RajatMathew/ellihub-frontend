import { z } from 'zod';

// --- Enums ---

export const InvoiceTypeEnum = z.enum(['PRELIMINARY', 'FINAL', 'REVISION']);
export const InvoiceCategoryEnum = z.enum([
    'MATERIALS',
    'LABOR',
    'EQUIPMENT',
    'SUBCONTRACTOR',
    'PROFESSIONAL_SERVICES',
    'OTHER',
]);
export const PaymentMethodEnum = z.enum(['CHECK', 'ACH', 'WIRE', 'CREDIT_CARD', 'OTHER']);

// --- Line Items ---

export const InvoiceLineItemCreateSchema = z.object({
    poLineItemId: z.string().min(1).optional(),
    description: z.string().min(1),
    qty: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    costCodeId: z.string().min(1).optional(),
});

export type InvoiceLineItemCreateRequest = z.infer<typeof InvoiceLineItemCreateSchema>;

export const InvoiceLineItemUpdateSchema = z
    .object({
        poLineItemId: z.string().min(1).optional().nullable(),
        description: z.string().min(1),
        qty: z.number().positive(),
        unit: z.string().min(1),
        unitPrice: z.number().min(0),
        costCodeId: z.string().min(1).optional().nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type InvoiceLineItemUpdateRequest = z.infer<typeof InvoiceLineItemUpdateSchema>;

// --- Invoice CRUD ---

export const InvoiceCreateSchema = z
    .object({
        poId: z.string().min(1).optional(),
        projectId: z.string().min(1).optional(),
        vendorId: z.string().min(1).optional(),
        invoiceNumber: z.string().min(1).max(100),
        invoiceDate: z.coerce.date(),
        dueDate: z.coerce.date().optional(),
        totalAmount: z.number().positive(),
        invoiceType: InvoiceTypeEnum.optional(),
        category: InvoiceCategoryEnum.optional(),
        notes: z.string().optional(),
        invoiceDocumentId: z.string().min(1).optional(),
        retainagePercent: z.number().min(0).max(100).optional(),
        taxAmount: z.number().min(0).optional(),
        taxRate: z.number().min(0).max(100).optional(),
        relatedSCOIds: z.array(z.string().min(1)).optional(),
        lineItems: z.array(InvoiceLineItemCreateSchema).optional(),
    })
    .refine((data) => data.poId || (data.projectId && data.vendorId), {
        message: 'Either poId or both projectId and vendorId are required',
    });

export type InvoiceCreateRequest = z.infer<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = z
    .object({
        invoiceNumber: z.string().min(1).max(100),
        invoiceDate: z.coerce.date(),
        dueDate: z.coerce.date(),
        totalAmount: z.number().positive(),
        invoiceType: InvoiceTypeEnum,
        category: InvoiceCategoryEnum.nullable(),
        notes: z.string().nullable(),
        invoiceDocumentId: z.string().min(1),
        retainagePercent: z.number().min(0).max(100),
        taxAmount: z.number().min(0).nullable(),
        taxRate: z.number().min(0).max(100).nullable(),
        relatedSCOIds: z.array(z.string().min(1)),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type InvoiceUpdateRequest = z.infer<typeof InvoiceUpdateSchema>;

// --- Workflow ---

export const InvoiceRejectSchema = z.object({
    reason: z.string().min(20),
});

export type InvoiceRejectRequest = z.infer<typeof InvoiceRejectSchema>;

export const MarkPaidSchema = z.object({
    paidAmount: z.number().positive(),
    paidDate: z.coerce.date(),
    paymentReference: z.string().max(100).optional(),
    paymentMethod: PaymentMethodEnum.optional(),
    notes: z.string().optional(),
});

export type MarkPaidRequest = z.infer<typeof MarkPaidSchema>;

// --- Dispute ---

export const DisputeSchema = z.object({
    disputeReason: z.string().min(1),
    notifyVendor: z.boolean().optional(),
});

export type DisputeRequest = z.infer<typeof DisputeSchema>;

export const ResolveDisputeSchema = z.object({
    resolution: z.string().min(1),
});

export type ResolveDisputeRequest = z.infer<typeof ResolveDisputeSchema>;
