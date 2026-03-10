import api from '@app/api';

import {
  projectDetailSchema,
  projectPaginatedResponseSchema,
  type CreateProjectInput,
  type ListProjectsParams,
  type ProjectDetail,
  type ProjectPaginatedResponse,
  type UpdateProjectInput,
} from '@modules/project/schemas/project.schema';

const BASE = '/projects';

export const projectApi = {
  async list(params?: ListProjectsParams): Promise<ProjectPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.statusId) query.statusId = params.statusId;
    if (params?.division) query.division = params.division;
    if (params?.stageId) query.stageId = params.stageId;
    if (params?.gcId) query.gcId = params.gcId;
    if (params?.leadPMId) query.leadPMId = params.leadPMId;
    if (params?.year != null) query.year = params.year;

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
    const result = projectPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectApi.list] Zod parse error:', result.error.issues);
      console.error('[projectApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<ProjectDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = projectDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectApi.getById] Zod parse error:', result.error.issues);
      console.error('[projectApi.getById] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreateProjectInput): Promise<ProjectDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = projectDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateProjectInput): Promise<ProjectDetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    const raw = res.data?.data ?? res.data;
    const result = projectDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async getInvoiceAging(
    id: string,
    params?: { asOfDate?: string; vendorId?: string },
  ): Promise<unknown> {
    const query: Record<string, string> = {};
    if (params?.asOfDate) query.asOfDate = params.asOfDate;
    if (params?.vendorId) query.vendorId = params.vendorId;
    const res = await api.get(`${BASE}/${id}/invoice-aging`, { params: query });
    return res.data?.data ?? res.data;
  },

  async getInvoiceSummary(id: string): Promise<unknown> {
    const res = await api.get(`${BASE}/${id}/invoice-summary`);
    return res.data?.data ?? res.data;
  },
};
