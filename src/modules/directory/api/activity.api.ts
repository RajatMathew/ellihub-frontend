import api from '@/app/api';
import {
  activityLogPaginatedResponseSchema,
  type ActivityLogPaginatedResponse,
  type ListActivityLogParams,
} from '@/modules/directory/schemas/activity.schema';

const BASE = '/activity-log';

export const activityApi = {
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
    }

    const res = await api.get(endpoint, { params: query });
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.size ?? 25,
      },
    };

    const result = activityLogPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[activityApi.list] Zod parse error:', result.error.issues);
      // Fallback if schema is slightly off but we want to show data
      return raw as ActivityLogPaginatedResponse;
    }
    return result.data;
  },
};
