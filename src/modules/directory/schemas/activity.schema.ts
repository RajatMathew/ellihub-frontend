import { z } from 'zod';

export const activityLogItemSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional().nullable(),
  note: z.string().optional().nullable(),
  affectedEntityIds: z.array(z.string()).optional().default([]),
  userId: z.string().optional().nullable(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const activityLogPaginatedResponseSchema = z.object({
  data: z.array(activityLogItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type ActivityLogItem = z.infer<typeof activityLogItemSchema>;
export type ActivityLogPaginatedResponse = z.infer<typeof activityLogPaginatedResponseSchema>;

export interface ListActivityLogParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  entityType?: string;
  entityId?: string;
}
