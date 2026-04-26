import z from 'zod';

export const SCOLineItemSchema = z.object({
    description: z.string().min(1).optional().nullable(),
    quantity: z.number().positive(),
    unitId: z.ulid(),
    unitPrice: z.number().nonnegative(),
    costCodeId: z.ulid().optional().nullable(),
});

export type SCOLineItemInput = z.infer<typeof SCOLineItemSchema>;

export const ScoCreateSchema = z.object({
    projectId: z.ulid(),
    purchaseOrderId: z.ulid(),
    date: z.iso.date(),
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    markupAmount: z.number().nonnegative().optional().nullable(),
    scheduleImpactDays: z.number().int().optional().nullable(),
    requestedBy: z.string().min(1).optional().nullable(),
    changeTypeId: z.ulid().optional().nullable(),
    impactsSchedule: z.boolean().optional(),
    lineItems: z.array(SCOLineItemSchema).min(1, 'At least one line item is required'),
});

export type ScoCreateRequest = z.infer<typeof ScoCreateSchema>;

export const ScoUpdateSchema = ScoCreateSchema.extend({ id: z.ulid() });

export type ScoUpdateRequest = z.infer<typeof ScoUpdateSchema>;

export const SetScoDraftSchema = z.object({
    id: z.ulid(),
});

export type SetScoDraftRequest = z.infer<typeof SetScoDraftSchema>;

export const SetScoApprovedSchema = z.object({
    id: z.ulid(),
});

export type SetScoApprovedRequest = z.infer<typeof SetScoApprovedSchema>;

export const SetScoRejectedSchema = z.object({
    id: z.ulid(),
    rejectionReason: z.string().min(1),
});

export type SetScoRejectedRequest = z.infer<typeof SetScoRejectedSchema>;

export const SetScoVoidSchema = z.object({
    id: z.ulid(),
    voidReason: z.string().min(1),
});

export type SetScoVoidRequest = z.infer<typeof SetScoVoidSchema>;

export const AddScoAttachmentSchema = z.object({
    scoId: z.ulid(),
    documentId: z.ulid(),
});

export type AddScoAttachmentRequest = z.infer<typeof AddScoAttachmentSchema>;

export const RemoveScoAttachmentSchema = z.object({
    id: z.ulid(),
});

export type RemoveScoAttachmentRequest = z.infer<typeof RemoveScoAttachmentSchema>;
