import z from 'zod';

// --- Enums ---

export const TradeCategoryEnum = z.enum([
    'MATERIAL',
    'FABRICATION',
    'INSTALLATION',
    'LABOR',
    'EQUIPMENT',
]);

export const PaymentMethodEnum = z.enum(['CHECK', 'ACH', 'WIRE', 'CREDIT_CARD', 'OTHER']);

export const PaymentTermsEnum = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

// --- Line Items ---

export const LineItemCreateSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    costCodeId: z.string().optional(),
    notes: z.string().optional(),
});

export type LineItemCreateRequest = z.infer<typeof LineItemCreateSchema>;

export const LineItemUpdateSchema = z
    .object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        unitPrice: z.number().min(0),
        costCodeId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type LineItemUpdateRequest = z.infer<typeof LineItemUpdateSchema>;

// --- PO CRUD ---

export const POCreateSchema = z.object({
    projectId: z.string().min(1),
    vendorId: z.string().min(1),
    rfqId: z.string().optional(),
    tradeCategory: TradeCategoryEnum,
    description: z.string().min(1),
    contactName: z.string().max(255).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(50).optional(),
    leadTime: z.string().optional(),
    issueDate: z.coerce.date(),
    expectedDate: z.coerce.date().optional(),
    shipToAddress: z.string().optional(),
    taxPercent: z.number().min(0).max(100).optional(),
    paymentTerms: PaymentTermsEnum,
    retainagePercent: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    vendorNotes: z.string().optional(),
    lineItems: z.array(LineItemCreateSchema).min(1),
});

export type POCreateRequest = z.infer<typeof POCreateSchema>;

export const POUpdateSchema = z
    .object({
        description: z.string().min(1),
        contactName: z.string().max(255).nullable(),
        contactEmail: z.string().email().nullable(),
        contactPhone: z.string().max(50).nullable(),
        leadTime: z.string().nullable(),
        expectedDate: z.coerce.date().nullable(),
        shipToAddress: z.string().nullable(),
        taxPercent: z.number().min(0).max(100),
        paymentTerms: PaymentTermsEnum,
        retainagePercent: z.number().min(0).max(100),
        notes: z.string().nullable(),
        vendorNotes: z.string().nullable(),
    })
    .partial();

export type POUpdateRequest = z.infer<typeof POUpdateSchema>;

// --- Workflow ---

export const IssueSchema = z.object({
    emailVendor: z.boolean().optional(),
});

export type IssueRequest = z.infer<typeof IssueSchema>;

export const CancelSchema = z.object({
    reason: z.string().min(20),
    notifyVendor: z.boolean().optional(),
    confirmPayments: z.boolean().optional(),
    confirmInvoices: z.boolean().optional(),
    confirmSCOs: z.boolean().optional(),
});

export type CancelRequest = z.infer<typeof CancelSchema>;

export const RecordDeliverySchema = z.object({
    deliveryDate: z.coerce.date(),
    notes: z.string().optional(),
});

export type RecordDeliveryRequest = z.infer<typeof RecordDeliverySchema>;

// --- Payments ---

export const PaymentCreateSchema = z.object({
    date: z.coerce.date(),
    reference: z.string().max(100).optional(),
    description: z.string().min(1),
    amount: z.number().positive(),
    paymentMethod: PaymentMethodEnum.optional(),
    invoiceId: z.string().optional(),
});

export type PaymentCreateRequest = z.infer<typeof PaymentCreateSchema>;

// --- RFQ-to-PO Generation ---

export const GeneratePOFromRFQSchema = z.object({
    vendorInviteId: z.string().min(1),
    taxPercent: z.number().min(0).max(100).optional(),
    paymentTerms: PaymentTermsEnum.optional(),
    shipToAddress: z.string().optional(),
    notes: z.string().optional(),
});

export type GeneratePOFromRFQRequest = z.infer<typeof GeneratePOFromRFQSchema>;
