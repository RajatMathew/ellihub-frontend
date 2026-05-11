import z from 'zod';

export const PTOCreateSchema = z
    .object({
        employeeId: z.ulid(),
        typeId: z.ulid(),
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
        id: z.ulid(),
        typeId: z.ulid().optional(),
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
    id: z.ulid(),
    note: z.string().trim().min(1).optional(),
});

export type PTOReviewRequest = z.infer<typeof PTOReviewSchema>;
