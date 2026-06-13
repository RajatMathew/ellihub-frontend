import api from '@/app/api';
import {
  ptoPaginatedResponseSchema,
  ptoSchema,
  ptoStatsSchema,
  type CreatePTOInput,
  type ListPTOParams,
  type PTO,
  type PTODecisionInput,
  type PTOPaginatedResponse,
  type PTOStats,
  type UpdatePTOInput,
} from '@/modules/hr/schemas/pto.schema';

const BASE = '/hr/pto';

export const ptoApi = {
  async list(params: ListPTOParams): Promise<PTOPaginatedResponse> {
    const res = await api.get(BASE, { params });
    const body = res.data?.data?.data ? res.data.data : res.data;
    const pagination = body?.pagination ?? {};
    const raw = {
      data: body?.data ?? [],
      pagination: {
        currentPage: pagination.currentPage ?? params.page,
        totalPages: pagination.totalPages ?? 1,
        totalItems: pagination.totalItems ?? (Array.isArray(body?.data) ? body.data.length : 0),
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
      },
    };
    return ptoPaginatedResponseSchema.parse(raw);
  },

  async stats(): Promise<PTOStats> {
    const res = await api.get(`${BASE}/stats`);
    return ptoStatsSchema.parse(res.data?.data ?? res.data);
  },

  async getById(id: string): Promise<PTO> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    return ptoSchema.parse(raw);
  },

  async create(data: CreatePTOInput): Promise<PTO> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    return ptoSchema.parse(raw);
  },

  async update(data: UpdatePTOInput): Promise<PTO> {
    const res = await api.put(BASE, data);
    const raw = res.data?.data ?? res.data;
    return ptoSchema.parse(raw);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async approve(data: PTODecisionInput): Promise<void> {
    await api.patch(`${BASE}/approve`, data);
  },

  async reject(data: PTODecisionInput): Promise<void> {
    await api.patch(`${BASE}/reject`, data);
  },
};
