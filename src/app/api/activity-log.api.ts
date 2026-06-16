import api from '@/app/api';
import { z } from 'zod';

const activityUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const activityLogItemSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  description: z.string(),
  note: z.string().optional().nullable(),
  affectedEntityIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  user: activityUserSchema,
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
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}

const BASE = '/activity-log';

export const activityLogApi = {
  async list(params?: ListActivityLogParams): Promise<ActivityLogPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;

    const endpoint =
      params?.entityType && params?.entityId
        ? `${BASE}/entity/${params.entityType}/${params.entityId}`
        : BASE;

    if (!params?.entityType || !params?.entityId) {
      if (params?.sortBy) query.sortBy = params.sortBy;
      if (params?.sortOrder) query.sortOrder = params.sortOrder;
      if (params?.entityType) query.entityType = params.entityType;
      if (params?.entityId) query.entityId = params.entityId;
      if (params?.action) query.action = params.action;
      if (params?.userId) query.userId = params.userId;
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      if (params?.search) query.search = params.search;
    }

    const res = await api.get(endpoint, { params: query });
    const rows = res.data?.data ?? res.data ?? [];
    const pagination = res.data?.pagination ?? {};

    return activityLogPaginatedResponseSchema.parse({
      data: rows,
      pagination: {
        currentPage: pagination.currentPage ?? params?.page ?? 1,
        totalPages: pagination.totalPages ?? 1,
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
        totalItems: pagination.totalItems ?? rows.length,
        itemsPerPage: pagination.itemsPerPage ?? params?.size ?? 25,
      },
    });
  },

  async listForEmployee(
    employeeId: string,
    params?: Pick<ListActivityLogParams, 'page' | 'size'>
  ): Promise<ActivityLogPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;

    const res = await api.get(`${BASE}/employee/${employeeId}`, { params: query });
    const rows = res.data?.data ?? res.data ?? [];
    const pagination = res.data?.pagination ?? {};

    return activityLogPaginatedResponseSchema.parse({
      data: rows,
      pagination: {
        currentPage: pagination.currentPage ?? params?.page ?? 1,
        totalPages: pagination.totalPages ?? 1,
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
        totalItems: pagination.totalItems ?? rows.length,
        itemsPerPage: pagination.itemsPerPage ?? params?.size ?? 100,
      },
    });
  },
};
