import api from '@/app/api';
import {
  getGeneratedPdfFileFromResponse,
  sanitizeDownloadName,
  type GeneratedPdfFile,
} from '@/app/lib/generated-pdf';
import {
  poDetailSchema,
  poPaginatedResponseSchema,
  poPdfDefaultTermsSchema,
  poPdfTermsOptionsSchema,
  poStatsSchema,
  type CreatePOInput,
  type GeneratePOPdfInput,
  type ListPOsParams,
  type PODetail,
  type POPaginatedResponse,
  type POPdfDefaultTerms,
  type POPdfTermsOption,
  type POStats,
} from '@/modules/project/schemas/purchase-order';

const BASE = '/po';
const LIST_BASE = '/purchase-order';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLookupValue(ref: unknown, key: 'id' | 'label' | 'name') {
  if (!isRecord(ref)) return undefined;
  const value = ref[key];
  return typeof value === 'string' ? value : undefined;
}

function normalizePODetail(item: unknown) {
  if (!isRecord(item)) return item;

  const status =
    typeof item.status === 'string'
      ? { id: item.status, name: item.status, label: item.status, color: item.status }
      : item.status;

  const tradeCategoryRef =
    item.tradeCategory ??
    (typeof item.tradeCategoryId === 'string'
      ? { id: item.tradeCategoryId, label: item.tradeCategoryId }
      : undefined);
  const tradeCategoryLabel =
    getLookupValue(tradeCategoryRef, 'label') ?? getLookupValue(tradeCategoryRef, 'name');
  const tradeCategory = ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'].includes(
    tradeCategoryLabel ?? ''
  )
    ? tradeCategoryLabel
    : undefined;

  return {
    ...item,
    status,
    tradeCategory,
    tradeCategoryLabel: tradeCategoryLabel ?? getLookupValue(tradeCategoryRef, 'id'),
    tradeCategoryId: item.tradeCategoryId ?? getLookupValue(tradeCategoryRef, 'id'),
  };
}

export const poApi = {
  async get(id: string): Promise<PODetail> {
    const res = await api.get(`${LIST_BASE}/${id}`);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async getPdfDefaultTerms(): Promise<POPdfDefaultTerms> {
    const res = await api.get(`${LIST_BASE}/pdf/default-terms`);
    const raw = res.data?.data ?? res.data;
    const result = poPdfDefaultTermsSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async getPdfTermsOptions(): Promise<POPdfTermsOption[]> {
    const res = await api.get(`${LIST_BASE}/pdf/terms`);
    const raw = res.data?.data ?? res.data;
    const result = poPdfTermsOptionsSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async generatePdf(
    id: string,
    data: GeneratePOPdfInput,
    poNumber?: string | null
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${LIST_BASE}/${id}/pdf`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${poNumber || 'purchase-order'}.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  async savePdf(
    id: string,
    data: GeneratePOPdfInput,
    poNumber?: string | null
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${LIST_BASE}/${id}/pdf/save`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${poNumber || 'purchase-order'}.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  async issue(id: string, data?: { emailVendor?: boolean }): Promise<PODetail> {
    void data;
    await api.patch(`${LIST_BASE}/set-issued`, { id });
    return this.get(id);
  },

  async cancel(
    id: string,
    data: {
      reason: string;
      notifyVendor?: boolean;
      confirmInvoices?: boolean;
      confirmSCOs?: boolean;
    }
  ): Promise<PODetail> {
    await api.patch(`${LIST_BASE}/set-cancelled`, {
      id,
      cancellationReason: data.reason,
    });
    return this.get(id);
  },

  async recordDelivery(
    id: string,
    data: { deliveryDate: string; notes?: string }
  ): Promise<PODetail> {
    await api.patch(`${LIST_BASE}/set-delivered`, { id, deliveryDate: data.deliveryDate });
    return this.get(id);
  },

  async list(params?: ListPOsParams): Promise<POPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.status) query.status = params.status;
    if (params?.tradeCategoryId) query.tradeCategoryId = params.tradeCategoryId;
    if (params?.vendorId) query.vendorId = params.vendorId;
    if (params?.rfqId) query.rfqId = params.rfqId;
    if (params?.startDate) query.startDate = params.startDate;
    if (params?.endDate) query.endDate = params.endDate;
    if (params?.overdue) query.overdue = params.overdue;

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
    const result = poPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async stats(projectId: string): Promise<POStats> {
    const res = await api.get(`${LIST_BASE}/project/${projectId}/stats`);
    const raw = res.data?.data ?? res.data;
    const result = poStatsSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreatePOInput): Promise<PODetail> {
    const res = await api.post(LIST_BASE, data);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<PODetail> {
    const res = await api.get(`${LIST_BASE}/${id}`);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: Partial<CreatePOInput>): Promise<PODetail> {
    const res = await api.put(LIST_BASE, { ...data, id });
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  /* ---- line items ---- */

  async addLineItem(poId: string, data: Record<string, unknown>) {
    const res = await api.post(`${BASE}/${poId}/line-items`, data);
    return res.data?.data ?? res.data;
  },

  async updateLineItem(poId: string, lineItemId: string, data: Record<string, unknown>) {
    const res = await api.put(`${BASE}/${poId}/line-items/${lineItemId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeLineItem(poId: string, lineItemId: string): Promise<void> {
    await api.delete(`${BASE}/${poId}/line-items/${lineItemId}`);
  },
};
