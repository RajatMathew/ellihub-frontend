import { z } from 'zod';

import api from '@app/api';

import {
  rfqAttachmentSchema,
  rfqDetailSchema,
  rfqPaginatedResponseSchema,
  rfqStatusSchema,
  type CreateRFQInput,
  type ListRFQParams,
  type RFQDetail,
  type RFQDeliverableInput,
  type RFQPaginatedResponse,
  type RFQStatus,
  type UpdateRFQInput,
  type VoidAwardInput,
} from '@modules/project/schemas/rfq.schema';

export type BidComparisonQuote = {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  status: { id: string; name: string; label: string } | null;
  totalAmount: number | null;
  taxAmount: number | null;
  grandTotal: number | null;
  leadTimeDays: number | null;
  warrantyPeriod: string | null;
  isResponsive: boolean | null;
  attachments?: {
    id: string;
    documentId: string;
    document: { id: string; name: string; mimeType?: string };
  }[];
  lineItems: {
    deliverableId: string;
    sequenceNumber: number | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    notes: string | null;
    alternateProposed: boolean;
  }[];
};

export type BidComparison = {
  rfq: {
    rfqNumber: string;
    title: string;
    estimatedBudget: number | null;
    bidDeadline: string;
    status: { id: string; name: string; label: string } | null;
  };
  deliverables: {
    id: string;
    sequenceNumber: number | null;
    description: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number | null;
    estimatedTotal: number | null;
  }[];
  quotes: BidComparisonQuote[];
  statistics: {
    lowestQuote: number | null;
    highestQuote: number | null;
    averageQuote: number | null;
    medianQuote: number | null;
    quotesSubmitted: number;
    quotesExpected: number;
    budgetVariance: number | null;
  };
};

const BASE = '/rfq';

function normalizeRFQ(item: any) {
  if (!item) return item;

  // Derive track and typeId from nested type object if needed
  const track = item.track || item.type?.label || undefined;
  const typeId = item.typeId || item.type?.id || undefined;

  const deliverables = (item.deliverables ?? item.rfqdeliverables ?? []).map((d: any) => ({
    ...d,
    unitId: d.unitId ?? d.unit?.id ?? '',
    unit: typeof d.unit === 'object' ? d.unit?.label : (d.unit ?? ''),
    description: d.name || d.description || '',
    name: d.name || d.description || '',
  }));

  // Normalize vendor quotes / invites
  const vendorQuotes = item.vendorQuotes ?? item.quotes ?? [];
  const normalizedInvites = vendorQuotes.map((q: any) => ({
    ...q,
    vendor: q.vendor ?? { id: q.vendorId },
  }));

  const normalizedQuotes = vendorQuotes
    .filter((q: any) => q.hasSubmittedQuote || q.quotedAmount != null)
    .map((q: any) => ({
      ...q,
      totalAmount: q.quotedAmount,
      grandTotal: q.quotedAmount,
      leadTimeDays: q.leadTime ? parseInt(q.leadTime, 10) : undefined,
      notes: q.leadTime ? `${q.leadTime} days` : q.notes,
      vendor: q.vendor ?? { id: q.vendorId },
    }));

  return {
    ...item,
    status:
      typeof item.status === 'string'
        ? { id: item.status, name: item.status, label: item.status }
        : item.status,
    track,
    typeId,
    deliverables,
    attachments: item.attachments ?? item.rfqattachments,
    invites: normalizedInvites,
    quotes: normalizedQuotes,
  };
}

export const rfqApi = {
  async list(params: ListRFQParams): Promise<RFQPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params.projectId) query.projectId = params.projectId;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.search) query.search = params.search;
    if (params.statusId) query.statusId = params.statusId;

    const res = await api.get(BASE, { params: query });
    const body = res.data;

    const normalizedData = (body?.data ?? []).map(normalizeRFQ);

    const raw = {
      data: normalizedData,
      pagination: body?.pagination ?? {
        currentPage: params.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(body?.data) ? body.data.length : 0,
        itemsPerPage: params.size ?? 25,
      },
    };

    const result = rfqPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getStatuses(): Promise<RFQStatus[]> {
    const res = await api.get('/lookup/type/RFQ_STATUS');
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(rfqStatusSchema).safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.getStatuses] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getTypes(): Promise<any[]> {
    const res = await api.get('/lookup/type/TRADE_CATEGORY');
    return res.data?.data ?? res.data ?? [];
  },

  async create(data: CreateRFQInput): Promise<RFQDetail> {
    const payload = {
      ...data,
      deliverables: data.deliverables.map((d) => ({
        ...d,
        name: d.name || d.description || 'Deliverable',
      })),
    };
    const res = await api.post(BASE, payload);
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<RFQDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateRFQInput): Promise<RFQDetail> {
    const payload = {
      ...data,
      id,
      deliverables: data.deliverables.map((d) => ({
        ...d,
        name: d.name || d.description || 'Deliverable',
      })),
    };
    const res = await api.put(BASE, payload);
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addDeliverable(rfqId: string, data: RFQDeliverableInput): Promise<unknown> {
    const payload = {
      ...data,
      name: data.name || data.description || 'Deliverable',
    };
    const res = await api.post(`${BASE}/${rfqId}/deliverables`, payload);
    return res.data?.data ?? res.data;
  },

  async updateDeliverable(
    rfqId: string,
    deliverableId: string,
    data: Partial<RFQDeliverableInput>,
  ): Promise<unknown> {
    const res = await api.put(`${BASE}/${rfqId}/deliverables/${deliverableId}`, data);
    return res.data?.data ?? res.data;
  },

  async removeDeliverable(rfqId: string, deliverableId: string): Promise<void> {
    await api.delete(`${BASE}/${rfqId}/deliverables/${deliverableId}`);
  },

  /* ---- Vendor invitations ---- */

  async addVendor(data: { rfqId: string; vendorId: string }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/add`, data);
    return res.data?.data ?? res.data;
  },

  async removeVendor(quoteId: string): Promise<void> {
    await api.patch(`${BASE}/vendor/remove`, { id: quoteId });
  },

  /* ---- Invite actions ---- */

  async declineInvite(data: { id: string; declineReason?: string }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/decline-quote`, data);
    return res.data?.data ?? res.data;
  },

  /* ---- Bid comparison ---- */

  async getBidComparison(rfqId: string): Promise<BidComparison> {
    console.log('[rfqApi.getBidComparison] fetching for:', rfqId);
    const res = await api.get(`${BASE}/${rfqId}/bid-comparison`);
    console.log('[rfqApi.getBidComparison] res:', res.status, res.data);
    const raw = res.data?.data ?? res.data;
    if (raw?.quotes?.[0]) console.log('[BidComparison] quote[0] keys:', Object.keys(raw.quotes[0]), 'attachments:', JSON.stringify(raw.quotes[0].attachments));
    return raw;
  },

  /* ---- Quotes ---- */

  async submitQuote(data: {
    id: string;
    quotedAmount: number;
    leadTime?: string;
    attachments?: string[];
  }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/submit-quote`, data);
    return res.data?.data ?? res.data;
  },

  async editQuote(data: {
    id: string;
    quotedAmount: number;
    leadTime?: string;
    attachments?: string[];
  }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/edit-quote`, data);
    return res.data?.data ?? res.data;
  },

  async removeQuote(id: string): Promise<void> {
    await api.patch(`${BASE}/vendor/remove-quote`, { id });
  },

  /* ---- Status ---- */

  async changeStatus(id: string, statusId: string): Promise<RFQDetail> {
    const res = await api.put(`${BASE}/${id}/status`, { statusId });
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.changeStatus] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- Workflow ---- */

  async publish(id: string): Promise<RFQDetail> {
    const res = await api.patch(`${BASE}/${id}/set-published`);
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.publish] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async cancel(id: string, cancellationReason?: string): Promise<RFQDetail> {
    const res = await api.patch(`${BASE}/set-void`, { id, cancellationReason });
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.cancel] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async award(quoteId: string): Promise<RFQDetail> {
    const res = await api.patch(`${BASE}/award`, { quoteId });
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.award] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async voidAward(id: string, data: VoidAwardInput): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/void-award`, data);
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.voidAward] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async unaward(rfqId: string): Promise<RFQDetail> {
    const res = await api.patch(`${BASE}/un-award`, { id: rfqId });
    const raw = normalizeRFQ(res.data?.data ?? res.data);
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.unaward] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async generatePO(rfqId: string): Promise<unknown> {
    const res = await api.post(`/purchase-order/from-rfq/${rfqId}`);
    return res.data?.data ?? res.data;
  },

  /* ---- Attachments ---- */

  async addAttachment(data: { rfqId: string; documentId: string }) {
    const res = await api.patch(`${BASE}/attachment/add`, data);
    return rfqAttachmentSchema.parse(res.data?.data ?? res.data);
  },

  async removeAttachment(attachmentId: string): Promise<void> {
    await api.patch(`${BASE}/attachment/remove`, { id: attachmentId });
  },

  /* ---- Quote Attachments ---- */

  async addQuoteAttachment(rfqId: string, quoteId: string, data: { fileId: string }) {
    const res = await api.post(`${BASE}/${rfqId}/quotes/${quoteId}/attachments`, data);
    return res.data?.data ?? res.data;
  },

  async removeQuoteAttachment(rfqId: string, quoteId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${rfqId}/quotes/${quoteId}/attachments/${attachmentId}`);
  },
};
