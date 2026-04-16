import api from '@app/api';

import {
  scoPaginatedResponseSchema,
  scoSummarySchema,
  scoChangeTypeSchema,
  scoDetailSchema,
  type ListSCOsParams,
  type SCOPaginatedResponse,
  type SCOSummary,
  type SCOChangeType,
  type SCODetail,
  type CreateSCOInput,
  type UpdateSCOInput,
  type SCOLineItemInput,
} from '../schemas/sco.schema';

const BASE = '/scos';

export const scoApi = {
  async list(params?: ListSCOsParams): Promise<SCOPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.poId) query.poId = params.poId;
    if (params?.status) query.status = params.status;
    if (params?.vendorId) query.vendorId = params.vendorId;
    if (params?.initiatedBy) query.initiatedBy = params.initiatedBy;
    if (params?.changeType) query.changeType = params.changeType;
    if (params?.startDate) query.startDate = params.startDate;
    if (params?.endDate) query.endDate = params.endDate;
    if (params?.search) query.search = params.search;

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
    const result = scoPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[scoApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async summary(projectId: string): Promise<SCOSummary> {
    const res = await api.get(`${BASE}/summary/project/${projectId}`);
    const raw = res.data?.data ?? res.data;
    const result = scoSummarySchema.safeParse(raw);
    if (!result.success) {
      console.error('[scoApi.summary] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async getChangeTypes(): Promise<SCOChangeType[]> {
    const res = await api.get('/lookup/type/SCO_CHANGE_TYPE');
    const raw = res.data?.data ?? res.data ?? [];
    return (raw as unknown[]).map((item) => {
      const result = scoChangeTypeSchema.safeParse(item);
      if (!result.success) return item as SCOChangeType;
      return result.data;
    });
  },

  async getById(id: string): Promise<SCODetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.getById] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async create(data: CreateSCOInput): Promise<SCODetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.create] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async update(id: string, data: UpdateSCOInput): Promise<SCODetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    const raw = res.data?.data ?? res.data;
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.update] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async addLineItem(scoId: string, data: SCOLineItemInput) {
    const res = await api.post(`${BASE}/${scoId}/line-items`, data);
    return res.data?.data ?? res.data;
  },

  async updateLineItem(scoId: string, lineItemId: string, data: SCOLineItemInput) {
    const res = await api.put(`${BASE}/${scoId}/line-items/${lineItemId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeLineItem(scoId: string, lineItemId: string): Promise<void> {
    await api.delete(`${BASE}/${scoId}/line-items/${lineItemId}`);
  },

  /* ---- workflow ---- */

  async approve(id: string): Promise<SCODetail> {
    const res = await api.post(`${BASE}/${id}/approve`);
    const raw = res.data?.data ?? res.data;
    // Backend returns { sco, poImpact } — parse the sco part
    const scoRaw = raw?.sco ?? raw;
    const result = scoDetailSchema.safeParse(scoRaw);
    if (!result.success) {
      console.warn('[scoApi.approve] Zod parse warning:', result.error.issues);
      // Approve succeeded on backend — return raw data to avoid blocking the UI
      return scoRaw as SCODetail;
    }
    return result.data;
  },

  async reject(id: string, data: { reason: string }): Promise<SCODetail> {
    const res = await api.post(`${BASE}/${id}/reject`, data);
    const raw = res.data?.data ?? res.data;
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.reject] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async voidSCO(id: string, data: { reason: string }): Promise<SCODetail> {
    const res = await api.post(`${BASE}/${id}/void`, data);
    const raw = res.data?.data ?? res.data;
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.voidSCO] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async revertToDraft(id: string): Promise<SCODetail> {
    const res = await api.post(`${BASE}/${id}/revert-to-draft`);
    const raw = res.data?.data ?? res.data;
    const scoRaw = raw?.sco ?? raw;
    const result = scoDetailSchema.safeParse(scoRaw);
    if (!result.success) {
      console.warn('[scoApi.revertToDraft] Zod parse warning:', result.error.issues);
      return scoRaw as SCODetail;
    }
    return result.data;
  },
};
