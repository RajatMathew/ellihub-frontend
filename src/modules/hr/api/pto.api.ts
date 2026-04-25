import api from '@app/api';
import {
  ptoSchema,
  ptoPaginatedResponseSchema,
  type PTO,
  type CreatePTOInput,
  type UpdatePTOInput,
  type PTODecisionInput,
  type PTOPaginatedResponse,
} from '../schemas/pto.schema';

const BASE = '/hr/pto';

export const ptoApi = {
  async list(params: { page?: number; size?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }): Promise<PTOPaginatedResponse> {
    const res = await api.get(BASE, { params });
    const raw = res.data;
    const result = ptoPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[ptoApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<PTO> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = ptoSchema.safeParse(raw);
    if (!result.success) {
      console.error('[ptoApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreatePTOInput): Promise<PTO> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = ptoSchema.safeParse(raw);
    if (!result.success) {
      console.error('[ptoApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(data: UpdatePTOInput): Promise<PTO> {
    const res = await api.put(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = ptoSchema.safeParse(raw);
    if (!result.success) {
      console.error('[ptoApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
