import z from 'zod';

export const RfqStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'AWARDED', 'VOID']);

export const RfqCreateSchema = z.object({
    projectId: z.ulid(),
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    bidDeadline: z.iso.date(),
    typeId: z.ulid(),
});

export type RfqCreateRequest = z.infer<typeof RfqCreateSchema>;
