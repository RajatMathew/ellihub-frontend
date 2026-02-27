import z from 'zod';

export const ProjectStageCreateSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    color: z.string().min(1).max(50),
});

export type ProjectStageCreateRequest = z.infer<typeof ProjectStageCreateSchema>;

export const ProjectStageUpdateSchema = z
    .object({
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(50),
        description: z.string().nullable(),
        color: z.string().min(1).max(50),
    })
    .partial();

export type ProjectStageUpdateRequest = z.infer<typeof ProjectStageUpdateSchema>;
