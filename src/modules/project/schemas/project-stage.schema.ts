import { z } from 'zod';

export const projectStageSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    description: z.string().nullable().optional(),
    color: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type ProjectStage = z.infer<typeof projectStageSchema>;

export const createProjectStageInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required').max(50),
});

export type CreateProjectStageInput = z.infer<typeof createProjectStageInputSchema>;

export const updateProjectStageInputSchema = createProjectStageInputSchema.partial();

export type UpdateProjectStageInput = z.infer<typeof updateProjectStageInputSchema>;
