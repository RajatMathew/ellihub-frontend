import { z } from 'zod';

import api from '@app/api';

import {
  pcoApproveResponseSchema,
  pcoDetailSchema,
  pcoFinancialImpactSchema,
  pcoPaginatedResponseSchema,
  pcoPipelineSchema,
  pcoStatusSchema,
  pcoChangeTypeSchema,
  type CreatePCOInput,
  type UpdatePCOInput,
  type PCOLineItemInput,
  type PCORejectInput,
  type PCOVoidInput,
  type ListPCOParams,
  type PCOPaginatedResponse,
  type PCOPipeline,
  type PCODetail,
  type PCOApproveResponse,
  type PCOStatus,
  type PCOChangeType,
  type PCOFinancialImpact,
} from '@modules/project/schemas/pco.schema';

const BASE = '/pcos';

/**
 * Backend wraps all responses in: { success, message, data, pagination?, ... }
 * Axios puts the parsed JSON into res.data, so:
 *   res.data.data   = the actual payload
 *   res.data.pagination = pagination object (for list endpoints)
 */

export const pcoApi = {
  /* ---- list + pipeline ---- */

  async list(params: ListPCOParams): Promise<PCOPaginatedResponse> {
    const query: Record<string, string | number> = {};
    query.projectId = params.projectId;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.search) query.search = params.search;
    if (params.status) query.status = params.status;
    if (params.changeTypeId) query.changeTypeId = params.changeTypeId;
    if (params.priority) query.priority = params.priority;
    if (params.dateFrom) query.dateFrom = params.dateFrom;
    if (params.dateTo) query.dateTo = params.dateTo;

    const res = await api.get(BASE, { params: query });
    const body = res.data;
    const raw = {
      data: body?.data ?? [],
      pagination: body?.pagination ?? {
        currentPage: params.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(body?.data) ? body.data.length : 0,
        itemsPerPage: params.size ?? 10,
      },
    };
    const result = pcoPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async pipeline(projectId: string): Promise<PCOPipeline> {
    const res = await api.get(`${BASE}/pipeline`, { params: { projectId } });
    const raw = res.data?.data?.pipeline ?? res.data?.data ?? res.data;
    const result = pcoPipelineSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.pipeline] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- CRUD ---- */

  async getById(id: string): Promise<PCODetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreatePCOInput): Promise<PCODetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdatePCOInput): Promise<PCODetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  /* ---- workflow ---- */

  async approve(id: string): Promise<PCOApproveResponse> {
    const res = await api.post(`${BASE}/${id}/approve`);
    const raw = res.data?.data ?? res.data;
    const result = pcoApproveResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.approve] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async reject(id: string, data: PCORejectInput): Promise<PCODetail> {
    const res = await api.post(`${BASE}/${id}/reject`, data);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.reject] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async voidPCO(id: string, data: PCOVoidInput): Promise<PCODetail> {
    const res = await api.post(`${BASE}/${id}/void`, data);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.voidPCO] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async transitionStatus(id: string, data: { status: string; reason?: string; onBehalfOf?: string }): Promise<PCODetail> {
    const res = await api.put(`${BASE}/${id}/status`, data);
    const raw = res.data?.data ?? res.data;
    const result = pcoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.transitionStatus] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- line items ---- */

  async addLineItem(pcoId: string, data: PCOLineItemInput) {
    const res = await api.post(`${BASE}/${pcoId}/line-items`, data);
    return res.data?.data ?? res.data;
  },

  async updateLineItem(pcoId: string, lineItemId: string, data: Partial<PCOLineItemInput>) {
    const res = await api.put(`${BASE}/${pcoId}/line-items/${lineItemId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeLineItem(pcoId: string, lineItemId: string): Promise<void> {
    await api.delete(`${BASE}/${pcoId}/line-items/${lineItemId}`);
  },

  /* ---- financial impact ---- */

  async getFinancialImpact(id: string): Promise<PCOFinancialImpact> {
    const res = await api.get(`${BASE}/${id}/financial-impact`);
    const raw = res.data?.data ?? res.data;
    const result = pcoFinancialImpactSchema.safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.getFinancialImpact] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- lookups ---- */

  async listStatuses(): Promise<PCOStatus[]> {
    const res = await api.get(`${BASE}/statuses`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(pcoStatusSchema).safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.listStatuses] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async listChangeTypes(): Promise<PCOChangeType[]> {
    const res = await api.get(`${BASE}/change-types`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(pcoChangeTypeSchema).safeParse(raw);
    if (!result.success) {
      console.error('[pcoApi.listChangeTypes] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },
};
