import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const PTOCreateSchema = z
    .object({
        employeeId: nanoIdSchema.optional(),
        typeId: nanoIdSchema,
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        reason: z.string().trim().min(1).optional(),
    })
    .refine((d) => d.endDate >= d.startDate, {
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
    });

export type PTOCreateRequest = z.infer<typeof PTOCreateSchema>;

export const PTOUpdateSchema = z
    .object({
        id: nanoIdSchema,
        typeId: nanoIdSchema.optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        reason: z.string().trim().min(1).nullable().optional(),
    })
    .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
    });

export type PTOUpdateRequest = z.infer<typeof PTOUpdateSchema>;

export const PTOReviewSchema = z.object({
    id: nanoIdSchema,
    note: z.string().trim().min(1).optional(),
});

export type PTOReviewRequest = z.infer<typeof PTOReviewSchema>;
