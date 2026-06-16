import api from '@/app/api';
import {
  vendorContactLinkSchema,
  vendorDetailSchema,
  vendorPaginatedResponseSchema,
  vendorStatsSchema,
  type CreateVendorContactInput,
  type CreateVendorInput,
  type ListVendorsParams,
  type UpdateVendorContactInput,
  type UpdateVendorInput,
  type VendorContactLink,
  type VendorDetail,
  type VendorPaginatedResponse,
  type VendorStats,
} from '@/modules/directory/schemas/vendor.schema';

const BASE = '/vendor';

export const vendorsApi = {
  async list(params?: ListVendorsParams): Promise<VendorPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.size = params.limit;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.type) {
      if (typeof params.type === 'string') {
        query.typeId = params.type;
      } else {
        query.typeId = params.type.id;
      }
    }
    if (params?.status) query.status = params.status;
    if (params?.categoryTag) query.categoryTag = params.categoryTag;
    if (params?.excludeIds?.length) query.excludeIds = params.excludeIds.join(',');

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
    const result = vendorPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[vendorsApi.list] Zod parse error:', result.error.issues);
      console.error('[vendorsApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<VendorDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = vendorDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[vendorsApi.getById] Partial Validation Failure:', result.error);
      return raw as VendorDetail;
    }
    return result.data;
  },

  async stats(): Promise<VendorStats> {
    const res = await api.get(`${BASE}/stats`);
    return vendorStatsSchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CreateVendorInput): Promise<VendorDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = vendorDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[vendorsApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateVendorInput): Promise<VendorDetail> {
    const res = await api.put(BASE, { ...data, id });
    const raw = res.data?.data ?? res.data;
    const result = vendorDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[vendorsApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addContact(id: string, data: CreateVendorContactInput): Promise<VendorContactLink> {
    const res = await api.post(`${BASE}/${id}/contacts`, data);
    return vendorContactLinkSchema.parse(res.data?.data ?? res.data);
  },

  async updateContact(
    id: string,
    contactId: string,
    data: UpdateVendorContactInput
  ): Promise<VendorContactLink> {
    const res = await api.put(`${BASE}/${id}/contacts/${contactId}`, data);
    return vendorContactLinkSchema.parse(res.data?.data ?? res.data);
  },

  async removeContact(id: string, contactId: string): Promise<void> {
    await api.delete(`${BASE}/${id}/contacts/${contactId}`);
  },

  async getTypes(): Promise<{ id: string; label: string; code: string }[]> {
    const res = await api.get('/lookup/type/VENDOR_TYPE');
    return res.data?.data ?? res.data ?? [];
  },
};
