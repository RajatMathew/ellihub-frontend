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
