import { z } from 'zod';

export const scheduleFileSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
  })
  .passthrough();

export type ScheduleFile = z.infer<typeof scheduleFileSchema>;

export const projectScheduleEntrySchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    date: z.string(),
    description: z.string(),
    adjustedFinishDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    fileId: z.string().nullable().optional(),
    file: scheduleFileSchema.nullable().optional(),
    changeOrderId: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type ProjectScheduleEntry = z.infer<typeof projectScheduleEntrySchema>;

export const createScheduleEntryInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(500),
  adjustedFinishDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  fileId: z.string().optional(),
});

export type CreateScheduleEntryInput = z.infer<typeof createScheduleEntryInputSchema>;

export const updateScheduleEntryInputSchema = z.object({
  id: z.string().min(1, 'Schedule entry is required'),
  date: z.string().optional(),
  description: z.string().max(500).optional(),
  adjustedFinishDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  fileId: z.string().nullable().optional(),
});

export type UpdateScheduleEntryInput = z.infer<typeof updateScheduleEntryInputSchema>;
