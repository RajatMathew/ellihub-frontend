import z from 'zod';

export const RfqStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'AWARDED', 'VOID']);

export const RfqDeliverableSchema = z.object({
    unitId: z.ulid(),
    quantity: z.number().positive(),
    costCodeId: z.ulid().optional().nullable(),
});

export type RfqDeliverableInput = z.infer<typeof RfqDeliverableSchema>;

export const RfqCreateSchema = z.object({
    projectId: z.ulid(),
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    bidDeadline: z.iso.date(),
    typeId: z.ulid(),
    deliverables: z.array(RfqDeliverableSchema).min(1, 'At least one deliverable is required'),
});

export type RfqCreateRequest = z.infer<typeof RfqCreateSchema>;

export const RfqUpdateSchema = z.object({
    id: z.ulid(),
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    bidDeadline: z.iso.date(),
    typeId: z.ulid(),
    deliverables: z.array(RfqDeliverableSchema).min(1, 'At least one deliverable is required'),
});

export type RfqUpdateRequest = z.infer<typeof RfqUpdateSchema>;

export const AddRfqAttachmentSchema = z.object({
    rfqId: z.ulid(),
    documentId: z.ulid(),
});

export type AddRfqAttachmentRequest = z.infer<typeof AddRfqAttachmentSchema>;

export const RemoveRfqAttachmentSchema = z.object({
    id: z.ulid(),
});

export type RemoveRfqAttachmentRequest = z.infer<typeof RemoveRfqAttachmentSchema>;

export const AddVendorSchema = z.object({
    rfqId: z.ulid(),
    vendorId: z.ulid(),
});

export type AddVendorRequest = z.infer<typeof AddVendorSchema>;

export const RemoveVendorSchema = z.object({
    id: z.ulid(),
});

export type RemoveVendorRequest = z.infer<typeof RemoveVendorSchema>;

export const SubmitQuoteSchema = z.object({
    id: z.ulid(),
    quotedAmount: z.number().nonnegative(),
    leadTime: z.string().min(1).optional().nullable(),
    attachments: z.array(z.ulid()).default([]),
});

export type SubmitQuoteRequest = z.infer<typeof SubmitQuoteSchema>;

export const EditQuoteSchema = SubmitQuoteSchema;

export type EditQuoteRequest = z.infer<typeof EditQuoteSchema>;

export const RemoveQuoteSchema = z.object({
    id: z.ulid(),
});

export type RemoveQuoteRequest = z.infer<typeof RemoveQuoteSchema>;

export const DeclineQuoteSchema = z.object({
    id: z.ulid(),
    declineReason: z.string().min(1).optional().nullable(),
});

export type DeclineQuoteRequest = z.infer<typeof DeclineQuoteSchema>;

export const VoidRfqSchema = z.object({
    id: z.ulid(),
    cancellationReason: z.string().min(1),
});

export type VoidRfqRequest = z.infer<typeof VoidRfqSchema>;

export const AwardRfqSchema = z.object({
    quoteId: z.ulid(),
});

export type AwardRfqRequest = z.infer<typeof AwardRfqSchema>;

export const UnawardRfqSchema = z.object({
    id: z.ulid(),
});

export type UnawardRfqRequest = z.infer<typeof UnawardRfqSchema>;
