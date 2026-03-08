import api from '@app/api';

import {
  poDetailSchema,
  poPaginatedResponseSchema,
  type CreatePOInput,
  type ListPOsParams,
  type PODetail,
  type POPaginatedResponse,
} from '../schemas/po.schema';

const BASE = '/pos';

export const poApi = {
  async list(params?: ListPOsParams): Promise<POPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.status) query.status = params.status;
    if (params?.tradeCategory) query.tradeCategory = params.tradeCategory;
    if (params?.vendorId) query.vendorId = params.vendorId;
    if (params?.startDate) query.startDate = params.startDate;
    if (params?.endDate) query.endDate = params.endDate;
    if (params?.overdue) query.overdue = params.overdue;

    const res = await api.get(BASE, { params: query });
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
    const result = poPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.list] Zod parse error:', result.error.issues);
      console.error('[poApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreatePOInput): Promise<PODetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.create] Zod parse error:', result.error.issues);
      console.error('[poApi.create] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
