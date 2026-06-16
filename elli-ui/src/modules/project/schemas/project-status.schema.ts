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
