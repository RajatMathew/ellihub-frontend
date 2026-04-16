import { z } from 'zod';

import api from '@app/api';
import {
  invoiceDetailSchema,
  invoicePaginatedResponseSchema,
  invoiceStatusSchema,
  invoiceSummarySchema,
  type CreateInvoiceInput,
  type InvoiceDetail,
  type InvoiceDisputeInput,
  type InvoiceLineItemInput,
  type InvoiceMarkPaidInput,
  type InvoicePaginatedResponse,
  type InvoiceRejectInput,
  type InvoiceResolveDisputeInput,
  type InvoiceStatus,
  type InvoiceSummary,
  type ListInvoiceParams,
  type UpdateInvoiceInput,
} from '@modules/project/schemas/invoice.schema';

const BASE = '/invoices';

export const invoiceApi = {
  /* ---- list + summary ---- */

  async list(params: ListInvoiceParams): Promise<InvoicePaginatedResponse> {
    const query: Record<string, string | number | boolean> = {};
    query.projectId = params.projectId;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.search) query.search = params.search;
    if (params.status) query.status = params.status;
    if (params.invoiceType) query.invoiceType = params.invoiceType;
    if (params.category) query.category = params.category;
    if (params.vendorId) query.vendorId = params.vendorId;
    if (params.isPaid != null) query.isPaid = params.isPaid;
    if (params.isDisputed != null) query.isDisputed = params.isDisputed;
    if (params.isOverdue != null) query.isOverdue = params.isOverdue;
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;

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

  async create(data: CreateInvoiceInput): Promise<InvoiceDetail> {
    // Strip empty/falsy optional fields
    const payload: Record<string, unknown> = {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      totalAmount: data.totalAmount,
    };
    if (data.poId) payload.poId = data.poId;
    if (data.projectId) payload.projectId = data.projectId;
    if (data.vendorId) payload.vendorId = data.vendorId;
    if (data.dueDate) payload.dueDate = data.dueDate;
    if (data.invoiceType) payload.invoiceType = data.invoiceType;
    if (data.category) payload.category = data.category;
    if (data.notes) payload.notes = data.notes;
    if (data.invoiceDocumentId) payload.invoiceDocumentId = data.invoiceDocumentId;
    if (data.retainagePercent != null && data.retainagePercent > 0)
      payload.retainagePercent = data.retainagePercent;
    if (data.taxAmount != null && data.taxAmount > 0) payload.taxAmount = data.taxAmount;
    if (data.taxRate != null && data.taxRate > 0) payload.taxRate = data.taxRate;
    if (data.lineItems && data.lineItems.length > 0) payload.lineItems = data.lineItems;

    const res = await api.post(BASE, payload);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateInvoiceInput): Promise<InvoiceDetail> {
    const res = await api.put(`${BASE}/${id}`, data);
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
    const res = await api.post(`${BASE}/${id}/mark-paid`, data);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.markPaid] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async dispute(id: string, data: InvoiceDisputeInput): Promise<InvoiceDetail> {
    const res = await api.post(`${BASE}/${id}/dispute`, data);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.dispute] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async resolveDispute(id: string, data: InvoiceResolveDisputeInput): Promise<InvoiceDetail> {
    const res = await api.post(`${BASE}/${id}/resolve-dispute`, data);
    const raw = res.data?.data ?? res.data;
    const result = invoiceDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[invoiceApi.resolveDispute] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
