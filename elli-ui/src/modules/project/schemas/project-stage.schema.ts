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
