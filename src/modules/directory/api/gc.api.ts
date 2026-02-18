import { z } from 'zod';

import api from '@app/api';
import {
  gcContactLinkSchema,
  gcPaginatedResponseSchema,
  gcStatsSchema,
  gcTypeSchema,
  generalContractorDetailSchema,
  type AddGCContactLinkInput,
  type CreateGCInput,
  type GCContactLink,
  type GCPaginatedResponse,
  type GCStats,
  type GCType,
  type GeneralContractorDetail,
  type ListGCsParams,
  type UpdateGCInput,
} from '@modules/directory/schemas/gc.schema';

const BASE = '/general-contractors';

export const gcApi = {
  async list(params?: ListGCsParams): Promise<GCPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.limit = params.limit;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.gcTypeId) query.gcTypeId = params.gcTypeId;
    if (params?.status) query.status = params.status;

    const res = await api.get(BASE, { params: query });
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.limit ?? 25,
      },
    };
    const result = gcPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[gcApi.list] Zod parse error:', result.error.issues);
      console.error('[gcApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<GeneralContractorDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = generalContractorDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[gcApi.getById] Zod parse error:', result.error.issues);
      console.error('[gcApi.getById] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async getStats(): Promise<GCStats> {
    const res = await api.get(`${BASE}/stats`);
    return gcStatsSchema.parse(res.data?.data ?? res.data);
  },

  async getTypes(): Promise<GCType[]> {
    const res = await api.get(`${BASE}/types`);
    const data = res.data?.data ?? res.data ?? [];
    return z.array(gcTypeSchema).parse(data);
  },

  async create(data: CreateGCInput): Promise<GeneralContractorDetail> {
    const res = await api.post(BASE, data);
    return generalContractorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async update(id: string, data: UpdateGCInput): Promise<GeneralContractorDetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    return generalContractorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  // Contact link endpoints
  async addContactLink(gcId: string, data: AddGCContactLinkInput): Promise<GCContactLink> {
    const res = await api.post(`${BASE}/${gcId}/contact-links`, data);
    return gcContactLinkSchema.parse(res.data?.data ?? res.data);
  },

  async removeContactLink(gcId: string, linkId: string): Promise<void> {
    await api.delete(`${BASE}/${gcId}/contact-links/${linkId}`);
  },
};
