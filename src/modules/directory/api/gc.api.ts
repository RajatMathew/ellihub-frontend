import api from '@app/api';
import {
  gcPaginatedResponseSchema,
  gcStatsSchema,
  generalContractorDetailSchema,
  type CreateGCContactInput,
  type CreateGCInput,
  type GCContact,
  type GCPaginatedResponse,
  type GCStats,
  type GeneralContractorDetail,
  type ListGCsParams,
  type UpdateGCContactInput,
  type UpdateGCInput,
} from '@modules/directory/schemas/gc.schema';

const BASE = '/general-contractors';

export const gcApi = {
  async list(params?: ListGCsParams): Promise<GCPaginatedResponse> {
    const query: Record<string, unknown> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.limit = params.limit;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.type) query.type = params.type;
    if (params?.status) query.status = params.status;

    const res = await api.get(BASE, { params: query });
    return gcPaginatedResponseSchema.parse({
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.limit ?? 25,
      },
    });
  },

  async getById(id: string): Promise<GeneralContractorDetail> {
    const res = await api.get(`${BASE}/${id}`);
    return generalContractorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async getStats(): Promise<GCStats> {
    const res = await api.get(`${BASE}/stats`);
    return gcStatsSchema.parse(res.data?.data ?? res.data);
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

  async addContact(id: string, data: CreateGCContactInput): Promise<GCContact> {
    const res = await api.post(`${BASE}/${id}/contacts`, data);
    return res.data?.data ?? res.data;
  },

  async updateContact(
    id: string,
    contactId: string,
    data: UpdateGCContactInput,
  ): Promise<GCContact> {
    const res = await api.put(`${BASE}/${id}/contacts/${contactId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeContact(id: string, contactId: string): Promise<void> {
    await api.delete(`${BASE}/${id}/contacts/${contactId}`);
  },
};
