import api from '@app/api';

import {
  poDetailSchema,
  poPaginatedResponseSchema,
  type CreatePOInput,
  type ListPOsParams,
  type PODetail,
  type POPaginatedResponse,
} from '../schemas/po.schema';

const BASE = '/po';
const LIST_BASE = '/purchase-order';

function normalizePODetail(item: any) {
  if (!item) return item;

  const status =
    typeof item.status === 'string'
      ? { id: item.status, name: item.status, label: item.status, color: item.status }
      : item.status;

  const tradeCategoryRef =
    item.tradeCategory ??
    (item.tradeCategoryId ? { id: item.tradeCategoryId, label: item.tradeCategoryId } : undefined);
  const tradeCategoryLabel = tradeCategoryRef?.label ?? tradeCategoryRef?.name;
  const tradeCategory = ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'].includes(
    tradeCategoryLabel,
  )
    ? tradeCategoryLabel
    : undefined;

  return {
    ...item,
    status,
    tradeCategory,
    tradeCategoryLabel: tradeCategoryLabel ?? tradeCategoryRef?.id,
    tradeCategoryId: item.tradeCategoryId ?? tradeCategoryRef?.id,
  };
}

export const poApi = {
  async get(id: string): Promise<PODetail> {
    const res = await api.get(`${LIST_BASE}/${id}`);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.get] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
    },
  ): Promise<PODetail> {
    await api.patch(`${LIST_BASE}/set-cancelled`, {
      id,
      cancellationReason: data.reason,
    });
    return this.get(id);
  },

  async recordDelivery(
    id: string,
    data: { deliveryDate: string; notes?: string },
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
      console.error('[poApi.list] Zod parse error:', result.error.issues);
      console.error('[poApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreatePOInput): Promise<PODetail> {
    const res = await api.post(LIST_BASE, data);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.create] Zod parse error:', result.error.issues);
      console.error('[poApi.create] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<PODetail> {
    const res = await api.get(`${LIST_BASE}/${id}`);
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: Partial<CreatePOInput>): Promise<PODetail> {
    const res = await api.put(LIST_BASE, { ...data, id });
    const raw = normalizePODetail(res.data?.data ?? res.data);
    const result = poDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[poApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async revertToDraft(id: string): Promise<PODetail> {
    await api.patch(`${LIST_BASE}/set-draft`, { id });
    return this.get(id);
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
