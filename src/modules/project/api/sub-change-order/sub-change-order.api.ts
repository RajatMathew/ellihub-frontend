import api from '@/app/api';
import {
  getGeneratedPdfFileFromResponse,
  sanitizeDownloadName,
  type GeneratedPdfFile,
} from '@/app/lib/generated-pdf';
import {
  scoChangeTypeSchema,
  scoDetailSchema,
  scoListItemSchema,
  scoPaginatedResponseSchema,
  scoStatsSchema,
  scoSummarySchema,
  type CreateSCOInput,
  type GenerateSCOPdfInput,
  type ListSCOsParams,
  type SCOChangeType,
  type SCODetail,
  type SCOLineItemInput,
  type SCOListItem,
  type SCOPaginatedResponse,
  type SCOStats,
  type SCOSummary,
  type UpdateSCOInput,
} from '@/modules/project/schemas/sub-change-order';

const LEGACY_BASE = '/sco';
const LIST_BASE = '/sub-change-order';

function normalizeSCODetail(item: unknown) {
  if (!item || typeof item !== 'object') return item;
  const value = item as Record<string, unknown>;

  const status =
    typeof value.status === 'string'
      ? { id: value.status, name: value.status, label: value.status, color: value.status }
      : value.status;

  return { ...value, status };
}

export const scoApi = {
  async list(params?: ListSCOsParams): Promise<SCOPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.purchaseOrderId) query.purchaseOrderId = params.purchaseOrderId;
    if (params?.status) query.status = params.status;
    if (params?.changeTypeId) query.changeTypeId = params.changeTypeId;
    if (params?.search) query.search = params.search;

    const res = await api.get(LIST_BASE, { params: query });
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

  async stats(projectId: string): Promise<SCOStats> {
    const res = await api.get(`${LIST_BASE}/project/${projectId}/stats`);
    const raw = res.data?.data ?? res.data;
    const result = scoStatsSchema.safeParse(raw);
    if (!result.success) {
      console.error('[scoApi.stats] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async summary(projectId: string): Promise<SCOSummary> {
    const res = await api.get(`${LEGACY_BASE}/summary/project/${projectId}`);
    const raw = res.data?.data ?? res.data;
    const result = scoSummarySchema.safeParse(raw);
    if (!result.success) {
      console.error('[scoApi.summary] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
    const res = await api.get(`${LIST_BASE}/${id}`);
    const raw = normalizeSCODetail(res.data?.data ?? res.data);
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.getById] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async listByPurchaseOrder(poId: string): Promise<SCOListItem[]> {
    const res = await api.get(`${LIST_BASE}/by-po/${poId}`);
    const raw = res.data?.data ?? res.data ?? [];
    return (raw as unknown[]).map((item) => {
      const result = scoListItemSchema.safeParse(item);
      if (!result.success) return item as SCOListItem;
      return result.data;
    });
  },

  async create(data: CreateSCOInput): Promise<SCODetail> {
    const res = await api.post(LIST_BASE, data);
    const raw = normalizeSCODetail(res.data?.data ?? res.data);
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.create] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async update(id: string, data: UpdateSCOInput): Promise<SCODetail> {
    const res = await api.put(LIST_BASE, { ...data, id });
    const raw = normalizeSCODetail(res.data?.data ?? res.data);
    const result = scoDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[scoApi.update] Zod parse warning:', result.error.issues);
      return raw as SCODetail;
    }
    return result.data;
  },

  async generatePdf(
    id: string,
    data: GenerateSCOPdfInput,
    scoNumber?: string | null
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${LIST_BASE}/${id}/pdf`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${scoNumber || 'sub-change-order'}.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  async savePdf(
    id: string,
    data: GenerateSCOPdfInput,
    scoNumber?: string | null
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${LIST_BASE}/${id}/pdf/save`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${scoNumber || 'sub-change-order'}.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  async addLineItem(scoId: string, data: SCOLineItemInput) {
    const res = await api.post(`${LEGACY_BASE}/${scoId}/line-items`, data);
    return res.data?.data ?? res.data;
  },

  async updateLineItem(scoId: string, lineItemId: string, data: SCOLineItemInput) {
    const res = await api.put(`${LEGACY_BASE}/${scoId}/line-items/${lineItemId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeLineItem(scoId: string, lineItemId: string): Promise<void> {
    await api.delete(`${LEGACY_BASE}/${scoId}/line-items/${lineItemId}`);
  },

  async approve(id: string): Promise<SCODetail> {
    await api.patch(`${LIST_BASE}/approve`, { id });
    return this.getById(id);
  },

  async reject(id: string, data: { reason: string }): Promise<SCODetail> {
    await api.patch(`${LIST_BASE}/reject`, { id, rejectionReason: data.reason });
    return this.getById(id);
  },

  async voidSCO(id: string, data: { reason: string }): Promise<SCODetail> {
    await api.patch(`${LIST_BASE}/set-void`, { id, voidReason: data.reason });
    return this.getById(id);
  },
};
