import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const ActivityEntityTypeSchema = z.enum([
    'user',
    'contact',
    'vendor',
    'gc',
    'employee',
    'department',
    'file',
    'costCode',
    'costCodeCategory',
    'professionalRole',
    'project',
    'rfq',
    'purchaseOrder',
    'primeChangeOrder',
    'subChangeOrder',
    'invoice',
    'template',
]);

export const ActivityActionSchema = z.enum([
    'create',
    'update',
    'delete',
    'link',
    'unlink',
    'addTag',
    'removeTag',
    'comment',
]);

export const ActivityLogCreateSchema = z.object({
    entityType: ActivityEntityTypeSchema,
    entityId: nanoIdSchema,
    action: ActivityActionSchema,
    description: z.string().min(1).max(500),
    note: z.string().min(1).max(2000).optional().nullable(),
});

export const ActivityCommentCreateSchema = z.object({
    note: z.string().trim().min(1).max(2000),
});

export const ActivityCommentUpdateSchema = ActivityCommentCreateSchema;

export const ActivityLogListQuerySchema = z.object({
    userId: z.string().optional(),
    entityType: ActivityEntityTypeSchema.optional(),
    entityId: z.string().optional(),
    action: ActivityActionSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    search: z.string().trim().min(1).max(200).optional(),
});

export type ActivityLogCreateRequest = z.infer<typeof ActivityLogCreateSchema>;
export type ActivityCommentCreateRequest = z.infer<typeof ActivityCommentCreateSchema>;
export type ActivityCommentUpdateRequest = z.infer<typeof ActivityCommentUpdateSchema>;
export type ActivityLogListQuery = z.infer<typeof ActivityLogListQuerySchema>;
