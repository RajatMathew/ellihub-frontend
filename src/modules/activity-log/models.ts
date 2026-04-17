import z from 'zod';

export const ActivityEntityTypeSchema = z.enum([
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
]);

export const ActivityActionSchema = z.enum([
    'create',
    'update',
    'delete',
    'link',
    'unlink',
    'addEmail',
    'removeEmail',
    'addPhone',
    'removePhone',
    'addTag',
    'removeTag',
    'comment',
]);

export const ActivityLogCreateSchema = z.object({
    entityType: ActivityEntityTypeSchema,
    entityId: z.ulid(),
    action: ActivityActionSchema,
    description: z.string().min(1).max(500),
    note: z.string().min(1).max(2000).optional().nullable(),
});

export type ActivityLogCreateRequest = z.infer<typeof ActivityLogCreateSchema>;
