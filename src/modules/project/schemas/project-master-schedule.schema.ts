import { fileSchema } from '@/modules/files/schemas/file.schema';
import { z } from 'zod';

export const projectMasterScheduleSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    fileId: z.string(),
    fileName: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    objectId: z.string().nullable().optional(),
    uploadedAt: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    deletedBy: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    file: fileSchema.nullable().optional(),
  })
  .passthrough();

export type ProjectMasterSchedule = z.infer<typeof projectMasterScheduleSchema>;

export const setProjectMasterScheduleInputSchema = z.object({
  fileId: z.string().min(1, 'File is required'),
});

export type SetProjectMasterScheduleInput = z.infer<
  typeof setProjectMasterScheduleInputSchema
>;