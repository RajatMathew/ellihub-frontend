import api from '@/app/api';

import {
  primeChangeOrderFinancialSummarySchema,
  primeChangeOrderPaginatedResponseSchema,
  primeChangeOrderStatusSummarySchema,
  primeChangeOrderSyncResponseSchema,
  primeChangeOrderSyncStatusResponseSchema,
  type ListPrimeChangeOrderParams,
  type PrimeChangeOrderFinancialSummary,
  type PrimeChangeOrderPaginatedResponse,
  type PrimeChangeOrderStatusSummaryItem,
  type PrimeChangeOrderSyncResponse,
  type PrimeChangeOrderSyncStatusResponse,
} from '@/modules/project/schemas/prime-change-order';

const BASE = '/prime-change-order';

export const primeChangeOrderApi = {
  async list(params: ListPrimeChangeOrderParams): Promise<PrimeChangeOrderPaginatedResponse> {
    const { projectId, ...rest } = params;
    const query: Record<string, string | number | boolean> = {};

    if (rest.page != null) query.page = rest.page;
    if (rest.size != null) query.size = rest.size;
    if (rest.sortBy) query.sortBy = rest.sortBy;
    if (rest.sortOrder) query.sortOrder = rest.sortOrder;
    if (rest.search) query.search = rest.search;
    if (rest.statusName) query.statusName = rest.statusName;
    if (rest.scheduleImpact) query.scheduleImpact = rest.scheduleImpact;
    if (rest.dueDateFrom) query.dueDateFrom = rest.dueDateFrom;
    if (rest.dueDateTo) query.dueDateTo = rest.dueDateTo;
    if (rest.totalCostMin) query.totalCostMin = rest.totalCostMin;
    if (rest.totalCostMax) query.totalCostMax = rest.totalCostMax;
    if (rest.includeDeleted) query.includeDeleted = true;

    const res = await api.get(`${BASE}/project/${projectId}`, { params: query });
    const body = res.data;
    const raw = {
      data: body?.data ?? [],
      pagination: body?.pagination ?? {
        currentPage: params.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(body?.data) ? body.data.length : 0,
        itemsPerPage: params.size ?? 25,
      },
    };

    const result = primeChangeOrderPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }

    return result.data;
  },

  async getStatusSummary(projectId: string): Promise<PrimeChangeOrderStatusSummaryItem[]> {
    const res = await api.get(`${BASE}/project/${projectId}/status-summary`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = primeChangeOrderStatusSummarySchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async getFinancialSummary(projectId: string): Promise<PrimeChangeOrderFinancialSummary> {
    const res = await api.get(`${BASE}/project/${projectId}/financial-summary`);
    const raw = res.data?.data ?? res.data;
    const result = primeChangeOrderFinancialSummarySchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async getSyncStatus(projectId: string): Promise<PrimeChangeOrderSyncStatusResponse> {
    const res = await api.get(`${BASE}/project/${projectId}/sync-status`);
    const raw = res.data?.data ?? res.data;
    const result = primeChangeOrderSyncStatusResponseSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async sync(projectId: string): Promise<PrimeChangeOrderSyncResponse> {
    const res = await api.patch(`${BASE}/project/${projectId}/sync`);
    const raw = res.data?.data ?? res.data;
    const result = primeChangeOrderSyncResponseSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
