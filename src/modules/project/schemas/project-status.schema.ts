import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'CLOSED', 'COMPLETED']);

export type ProjectStatusEnum = z.infer<typeof ProjectStatusSchema>;

export const projectStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number(),
    isDefault: z.boolean().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const createProjectStatusInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  label: z.string().min(1, 'Label is required').max(100),
  color: z.string().min(1, 'Color is required').max(50),
  order: z.number().int().positive(),
  isDefault: z.boolean().optional(),
});

export type CreateProjectStatusInput = z.infer<typeof createProjectStatusInputSchema>;

export const updateProjectStatusInputSchema = createProjectStatusInputSchema.partial();

export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusInputSchema>;
