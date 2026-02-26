import z from 'zod';

// --- Enums for validation ---

export const BiddingTypeEnum = z.enum(['ANONYMOUS', 'OPEN']);

// --- Deliverables ---

export const DeliverableCreateSchema = z.object({
    description: z.string().min(1),
    specifications: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    costCodeId: z.string().optional(),
    estimatedUnitPrice: z.number().positive().optional(),
});

export type DeliverableCreateRequest = z.infer<typeof DeliverableCreateSchema>;

export const DeliverableUpdateSchema = z
    .object({
        description: z.string().min(1),
        specifications: z.string().nullable(),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        costCodeId: z.string().nullable(),
        estimatedUnitPrice: z.number().positive().nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type DeliverableUpdateRequest = z.infer<typeof DeliverableUpdateSchema>;

// --- RFQ CRUD ---

export const RFQCreateSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    costCodeId: z.string().optional(),
    estimatedBudget: z.number().positive().optional(),
    bidDeadline: z.coerce.date(),
    biddingType: BiddingTypeEnum.optional(),
    minimumVendors: z.number().int().min(1).optional(),
    deliverables: z.array(DeliverableCreateSchema).min(1),
});

export type RFQCreateRequest = z.infer<typeof RFQCreateSchema>;

export const RFQUpdateSchema = z
    .object({
        title: z.string().min(1).max(255),
        description: z.string().nullable(),
        costCodeId: z.string().nullable(),
        estimatedBudget: z.number().positive().nullable(),
        bidDeadline: z.coerce.date(),
        biddingType: BiddingTypeEnum,
        minimumVendors: z.number().int().min(1),
    })
    .partial();

export type RFQUpdateRequest = z.infer<typeof RFQUpdateSchema>;

// --- Vendor Invitations ---

export const VendorInviteSchema = z.object({
    vendorIds: z.array(z.string().min(1)).min(1),
    sendInviteEmails: z.boolean().optional(),
});

export type VendorInviteRequest = z.infer<typeof VendorInviteSchema>;

export const DeclineSchema = z.object({
    declineReason: z.string().optional(),
});

export type DeclineRequest = z.infer<typeof DeclineSchema>;

// --- Quotes ---

export const QuoteLineItemSchema = z.object({
    deliverableId: z.string().min(1),
    unitPrice: z.number().positive(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    notes: z.string().optional(),
    alternateProposed: z.boolean().optional(),
    alternateDescription: z.string().optional(),
});

export const QuoteCreateSchema = z.object({
    vendorId: z.string().min(1),
    lineItems: z.array(QuoteLineItemSchema).min(1),
    leadTimeDays: z.number().int().positive().optional(),
    deliveryDate: z.coerce.date().optional(),
    paymentTerms: z.string().optional(),
    warrantyPeriod: z.string().optional(),
    quoteValidDays: z.number().int().positive().optional(),
    notes: z.string().optional(),
    qualifications: z.string().optional(),
    taxAmount: z.number().min(0).optional(),
    submittedBy: z.string().optional(),
    submittedByEmail: z.string().email().optional(),
    submittedByPhone: z.string().optional(),
    submittedAt: z.coerce.date().optional(),
});

export type QuoteCreateRequest = z.infer<typeof QuoteCreateSchema>;

export const QuoteUpdateSchema = z
    .object({
        lineItems: z.array(QuoteLineItemSchema).min(1),
        leadTimeDays: z.number().int().positive().nullable(),
        deliveryDate: z.coerce.date().nullable(),
        paymentTerms: z.string().nullable(),
        warrantyPeriod: z.string().nullable(),
        quoteValidDays: z.number().int().positive().nullable(),
        notes: z.string().nullable(),
        qualifications: z.string().nullable(),
        taxAmount: z.number().min(0).nullable(),
        submittedBy: z.string().nullable(),
        submittedByEmail: z.string().email().nullable(),
        submittedByPhone: z.string().nullable(),
        submittedAt: z.coerce.date().nullable(),
    })
    .partial();

export type QuoteUpdateRequest = z.infer<typeof QuoteUpdateSchema>;

// --- Workflow ---

export const PublishSchema = z.object({
    vendorIds: z.array(z.string().min(1)).min(1),
    sendInviteEmails: z.boolean().optional(),
});

export type PublishRequest = z.infer<typeof PublishSchema>;

export const CancelSchema = z.object({
    cancellationReason: z.string().min(1),
});

export type CancelRequest = z.infer<typeof CancelSchema>;

export const AwardSchema = z.object({
    awardedQuoteId: z.string().min(1),
    awardedVendorId: z.string().min(1),
    awardedAmount: z.number().positive(),
    autoGeneratePO: z.boolean().optional(),
    sendAwardEmail: z.boolean().optional(),
    sendRegretEmails: z.boolean().optional(),
});

export type AwardRequest = z.infer<typeof AwardSchema>;

export const VoidAwardSchema = z.object({
    voidReason: z.string().min(1),
});

export type VoidAwardRequest = z.infer<typeof VoidAwardSchema>;

// --- Addendums ---

export const AddendumCreateSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    changeTypeId: z.string().min(1),
    changesDescription: z.string().min(1),
    impactsDeadline: z.boolean().optional(),
    newBidDeadline: z.coerce.date().optional(),
    impactsScope: z.boolean().optional(),
    impactsPricing: z.boolean().optional(),
    requiresAcknowledgment: z.boolean().optional(),
});

export type AddendumCreateRequest = z.infer<typeof AddendumCreateSchema>;
