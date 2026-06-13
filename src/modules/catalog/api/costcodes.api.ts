import api from '@/app/api';
import {
  costCodePaginatedResponseSchema,
  costCodeSchema,
  costCodeStatsSchema,
  type CostCode,
  type CostCodeCreate,
  type CostCodeFilters,
  type CostCodeStats,
} from '@/modules/catalog/schemas/costcode.schema';

const BASE = '/cost-code';

export const costCodesApi = {
  async list(filters?: CostCodeFilters): Promise<{ data: CostCode[]; count: number }> {
    const params: Record<string, unknown> = {};
    if (filters?.page != null) params.page = filters.page;
    if (filters?.size != null) params.size = filters.size;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters?.search) params.search = filters.search;
    if (filters?.costCodeCategoryId) params.costCodeCategoryId = filters.costCodeCategoryId;

    const res = await api.get(`${BASE}`, { params });
    return costCodePaginatedResponseSchema.parse({
      data: res.data?.data ?? res.data ?? [],
      count:
        res.data?.count ??
        (Array.isArray(res.data?.data) ? res.data.pagination.totalItems : (res.data?.count ?? 0)),
    });
  },

  async stats(): Promise<CostCodeStats> {
    const res = await api.get(`${BASE}/stats`);
    return costCodeStatsSchema.parse(res.data?.data ?? res.data);
  },

  async get(id: string): Promise<CostCode> {
    const res = await api.get(`${BASE}/${id}`);
    return costCodeSchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CostCodeCreate): Promise<CostCode> {
    const res = await api.post(`${BASE}`, data);
    return costCodeSchema.parse(res.data?.data ?? res.data);
  },

  async update(data: CostCode): Promise<CostCode> {
    const payload = {
      id: data.id,
      name: data.name,
      code: data.code,
      costCodeCategoryId: data.costCodeCategoryId,
      description: data.description ?? null,
    };
    const res = await api.put(`${BASE}/${data.id}`, payload);
    return costCodeSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
