import api from '@app/api';
import {
  vendorDetailSchema,
  vendorPaginatedResponseSchema,
  type CreateVendorContactInput,
  type CreateVendorInput,
  type ListVendorsParams,
  type UpdateVendorContactInput,
  type UpdateVendorInput,
  type VendorContact,
  type VendorDetail,
  type VendorPaginatedResponse,
} from '@modules/directory/schemas/vendor.schema';

const BASE = '/vendors';

export const vendorsApi = {
  async list(params?: ListVendorsParams): Promise<VendorPaginatedResponse> {
    const query: Record<string, unknown> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.limit != null) query.limit = params.limit;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.type) query.type = params.type;
    if (params?.status) query.status = params.status;
    if (params?.categoryTag) query.categoryTag = params.categoryTag;

    const res = await api.get(BASE, { params: query });
    return vendorPaginatedResponseSchema.parse({
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

  async getById(id: string): Promise<VendorDetail> {
    const res = await api.get(`${BASE}/${id}`);
    return vendorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CreateVendorInput): Promise<VendorDetail> {
    const res = await api.post(BASE, data);
    return vendorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async update(id: string, data: UpdateVendorInput): Promise<VendorDetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    return vendorDetailSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addContact(id: string, data: CreateVendorContactInput): Promise<VendorContact> {
    const res = await api.post(`${BASE}/${id}/contacts`, data);
    return res.data?.data ?? res.data;
  },

  async updateContact(
    id: string,
    contactId: string,
    data: UpdateVendorContactInput,
  ): Promise<VendorContact> {
    const res = await api.put(`${BASE}/${id}/contacts/${contactId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeContact(id: string, contactId: string): Promise<void> {
    await api.delete(`${BASE}/${id}/contacts/${contactId}`);
  },
};
