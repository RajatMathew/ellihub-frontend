import { z } from 'zod';

export const scheduleFileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();

export type ScheduleFile = z.infer<typeof scheduleFileSchema>;

export const projectScheduleEntrySchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    date: z.string(),
    description: z.string(),
    adjustedStartDate: z.string().nullable().optional(),
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

export const schedulePaginatedResponseSchema = z.object({
  data: z.array(projectScheduleEntrySchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type SchedulePaginatedResponse = z.infer<typeof schedulePaginatedResponseSchema>;

export const createScheduleEntryInputSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(500),
  adjustedStartDate: z.string().optional(),
  adjustedFinishDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  fileId: z.string().optional(),
});

export type CreateScheduleEntryInput = z.infer<typeof createScheduleEntryInputSchema>;

export const updateScheduleEntryInputSchema = z.object({
  date: z.string().optional(),
  description: z.string().max(500).optional(),
  adjustedStartDate: z.string().nullable().optional(),
  adjustedFinishDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  fileId: z.string().nullable().optional(),
});

export type UpdateScheduleEntryInput = z.infer<typeof updateScheduleEntryInputSchema>;

export const listScheduleParamsSchema = z.object({
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListScheduleParams = z.infer<typeof listScheduleParamsSchema>;
