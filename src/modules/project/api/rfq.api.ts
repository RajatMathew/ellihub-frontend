import { z } from 'zod';

import api from '@app/api';

import {
  rfqDetailSchema,
  rfqPaginatedResponseSchema,
  rfqStatusSchema,
  type AwardRFQInput,
  type CancelRFQInput,
  type CreateRFQInput,
  type ListRFQParams,
  type PublishRFQInput,
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

const BASE = '/rfqs';

export const rfqApi = {
  async list(params: ListRFQParams): Promise<RFQPaginatedResponse> {
    const query: Record<string, string | number> = {};
    query.projectId = params.projectId;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;
    if (params.search) query.search = params.search;
    if (params.statusId) query.statusId = params.statusId;

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

  async listStatuses(): Promise<RFQStatus[]> {
    const res = await api.get(`${BASE}/statuses`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(rfqStatusSchema).safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.listStatuses] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async create(data: CreateRFQInput): Promise<RFQDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<RFQDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.getById] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(id: string, data: UpdateRFQInput): Promise<RFQDetail> {
    const res = await api.put(`${BASE}/${id}`, data);
    const raw = res.data?.data ?? res.data;
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
    const res = await api.post(`${BASE}/${rfqId}/deliverables`, data);
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

  async inviteVendors(
    rfqId: string,
    data: { vendorIds: string[]; sendInviteEmails?: boolean },
  ): Promise<unknown> {
    const res = await api.post(`${BASE}/${rfqId}/invite-vendors`, data);
    return res.data?.data ?? res.data;
  },

  /* ---- Invite actions ---- */

  async declineInvite(
    rfqId: string,
    inviteId: string,
    data: { declineReason?: string },
  ): Promise<unknown> {
    const res = await api.put(`${BASE}/${rfqId}/invites/${inviteId}/decline`, data);
    return res.data?.data ?? res.data;
  },

  /* ---- Bid comparison ---- */

  async getBidComparison(rfqId: string): Promise<BidComparison> {
    const res = await api.get(`${BASE}/${rfqId}/bid-comparison`);
    return res.data?.data ?? res.data;
  },

  /* ---- Quotes ---- */

  async createQuote(
    rfqId: string,
    data: {
      vendorId: string;
      lineItems: { deliverableId: string; unitPrice: number; quantity: number; unit: string }[];
      leadTimeDays?: number;
      notes?: string;
    },
  ): Promise<unknown> {
    const res = await api.post(`${BASE}/${rfqId}/quotes`, data);
    return res.data?.data ?? res.data;
  },

  async updateQuote(
    rfqId: string,
    quoteId: string,
    data: {
      lineItems: { deliverableId: string; unitPrice: number; quantity: number; unit: string }[];
      leadTimeDays?: number | null;
      notes?: string | null;
    },
  ): Promise<unknown> {
    const res = await api.put(`${BASE}/${rfqId}/quotes/${quoteId}`, data);
    return res.data?.data ?? res.data;
  },

  /* ---- Status ---- */

  async changeStatus(id: string, statusId: string): Promise<RFQDetail> {
    const res = await api.put(`${BASE}/${id}/status`, { statusId });
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.changeStatus] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /* ---- Workflow ---- */

  async publish(id: string, data: PublishRFQInput): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/publish`, data);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.publish] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async cancel(id: string, data: CancelRFQInput): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/cancel`, data);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.cancel] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async award(id: string, data: AwardRFQInput): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/award`, data);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.award] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async voidAward(id: string, data: VoidAwardInput): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/void-award`, data);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.voidAward] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async unaward(id: string): Promise<RFQDetail> {
    const res = await api.post(`${BASE}/${id}/unaward`);
    const raw = res.data?.data ?? res.data;
    const result = rfqDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.unaward] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async generatePO(
    rfqId: string,
    data: { vendorInviteId: string; taxPercent?: number; paymentTerms?: string; notes?: string },
  ): Promise<unknown> {
    const res = await api.post(`${BASE}/${rfqId}/generate-po`, data);
    return res.data?.data ?? res.data;
  },
};
