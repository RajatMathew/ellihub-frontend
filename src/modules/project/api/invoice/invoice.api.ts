import api from '@/app/api';
import {
  invoiceDetailSchema,
  invoiceListItemSchema,
  invoicePaginatedResponseSchema,
  invoiceStatsSchema,
  invoiceStatusSchema,
  invoiceSummarySchema,
  type CreateInvoiceInput,
  type InvoiceDetail,
  type InvoiceDisputeInput,
  type InvoiceLineItemInput,
  type InvoiceListItem,
  type InvoiceMarkPaidInput,
  type InvoicePaginatedResponse,
  type InvoiceRejectInput,
  type InvoiceResolveDisputeInput,
  type InvoiceStats,
  type InvoiceStatus,
  type InvoiceSummary,
  type ListInvoiceParams,
  type UpdateInvoiceInput,
} from '@/modules/project/schemas/invoice';
import { z } from 'zod';

const BASE = '/invoice';

export const invoiceApi = {
  /* ---- list + summary ---- */

  async list(params: ListInvoiceParams): Promise<InvoicePaginatedResponse> {
    const query: Record<string, string | number | boolean> = {};
    if (params.projectId) query.projectId = params.projectId;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.search) query.search = params.search;
    if (params.vendorId) query.vendorId = params.vendorId;
    if (params.purchaseOrderId) query.purchaseOrderId = params.purchaseOrderId;
    if (params.isPaid != null) query.isPaid = params.isPaid;

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
    const result = invoicePaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async stats(projectId: string): Promise<InvoiceStats> {
    const res = await api.get(`${BASE}/project/${projectId}/stats`);
    const raw = res.data?.data ?? res.data;
    const result = invoiceStatsSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.stats] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async summary(projectId: string): Promise<InvoiceSummary> {
    const res = await api.get(`/project/${projectId}/invoice-summary`);
    const raw = res.data?.data ?? res.data;
    const result = invoiceSummarySchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.summary] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- CRUD ---- */

  async getById(id: string): Promise<InvoiceDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async listByPurchaseOrder(poId: string): Promise<InvoiceListItem[]> {
    const res = await api.get(`${BASE}/by-po/${poId}`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(invoiceListItemSchema).safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.listByPurchaseOrder] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreateInvoiceInput): Promise<InvoiceDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateInvoiceInput): Promise<InvoiceDetail> {
    const res = await api.put(BASE, { ...data, id });
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  /* ---- workflow ---- */

  async approve(id: string): Promise<InvoiceDetail> {
    const res = await api.post(`${BASE}/${id}/approve`);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.approve] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async reject(id: string, data: InvoiceRejectInput): Promise<InvoiceDetail> {
    const res = await api.post(`${BASE}/${id}/reject`, data);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.reject] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async markPaid(id: string, data: InvoiceMarkPaidInput): Promise<InvoiceDetail> {
    await api.patch(`${BASE}/mark-paid`, { id, ...data });
    return this.getById(id);
  },

  async markUnpaid(id: string): Promise<InvoiceDetail> {
    await api.patch(`${BASE}/mark-unpaid`, { id });
    return this.getById(id);
  },

  async dispute(id: string, data: InvoiceDisputeInput): Promise<InvoiceDetail> {
    await api.patch(`${BASE}/dispute`, { id, disputeReason: data.disputeReason });
    return this.getById(id);
  },

  async resolveDispute(id: string, _data?: InvoiceResolveDisputeInput): Promise<InvoiceDetail> {
    await api.patch(`${BASE}/resolve-dispute`, { id });
    return this.getById(id);
  },

  /* ---- line items ---- */

  async addLineItem(invoiceId: string, data: InvoiceLineItemInput) {
    const res = await api.post(`${BASE}/${invoiceId}/line-items`, data);
    return res.data?.data ?? res.data;
  },

  async updateLineItem(invoiceId: string, lineItemId: string, data: Partial<InvoiceLineItemInput>) {
    const res = await api.put(`${BASE}/${invoiceId}/line-items/${lineItemId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeLineItem(invoiceId: string, lineItemId: string): Promise<void> {
    await api.delete(`${BASE}/${invoiceId}/line-items/${lineItemId}`);
  },

  /* ---- lookups ---- */

  async listStatuses(): Promise<InvoiceStatus[]> {
    const res = await api.get('/lookup/type/INVOICE_STATUS');
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(invoiceStatusSchema).safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.listStatuses] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },
};
