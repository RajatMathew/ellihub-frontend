import api from '@/app/api';
import {
  gcPaginatedResponseSchema,
  gcStatsSchema,
  gcTypeSchema,
  generalContractorDetailSchema,
  type AddGCContactLinkInput,
  type CreateGCInput,
  type GCPaginatedResponse,
  type GCStats,
  type GCType,
  type GeneralContractorDetail,
  type ListGCsParams,
  type UpdateGCInput,
} from '@/modules/directory/schemas/gc.schema';
import { z } from 'zod';

const BASE = '/gc';

export const gcApi = {
  async list(params?: ListGCsParams): Promise<GCPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.size = params.limit;
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
      console.warn('[gcApi.getById] Partial Validation Failure:', result.error);
      return raw as GeneralContractorDetail;
    }
    return result.data;
  },

  async getStats(): Promise<GCStats> {
    const res = await api.get(`${BASE}/stats`);
    const data = res.data?.data ?? res.data ?? {};
    return gcStatsSchema.parse(data);
  },
  async getTypes(): Promise<GCType[]> {
    const res = await api.get('/lookup/type/GC_TYPE');
    const data = res.data?.data ?? res.data ?? [];
    return z.array(gcTypeSchema).parse(data);
  },

  async create(data: CreateGCInput): Promise<GeneralContractorDetail> {
    const res = await api.post(BASE, data);
    const parsed = generalContractorDetailSchema.safeParse(res.data?.data ?? res.data);
    if (!parsed.success) {
      console.warn('[gcApi.create] Partial Validation Failure:', parsed.error);
      return (res.data?.data ?? res.data) as GeneralContractorDetail;
    }
    return parsed.data;
  },

  async update(id: string, data: UpdateGCInput): Promise<GeneralContractorDetail> {
    const res = await api.put(BASE, { ...data, id });
    const parsed = generalContractorDetailSchema.safeParse(res.data?.data ?? res.data);
    if (!parsed.success) {
      console.warn('[gcApi.update] Partial Validation Failure:', parsed.error);
      return (res.data?.data ?? res.data) as GeneralContractorDetail;
    }
    return parsed.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  // Contact link endpoints
  async addContactLink(gcId: string, data: AddGCContactLinkInput): Promise<unknown> {
    const res = await api.patch('/contact/gc/add', {
      ...data,
      generalContractorId: gcId,
    });
    return res.data?.data ?? res.data;
  },

  async removeContactLink(gcId: string, contactId: string): Promise<void> {
    await api.patch('/contact/gc/remove', {
      contactId,
      generalContractorId: gcId,
    });
  },
};
