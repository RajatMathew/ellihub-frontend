import api from '@/app/api';
import {
  getGeneratedPdfFileFromResponse,
  sanitizeDownloadName,
  type GeneratedPdfFile,
} from '@/app/lib/generated-pdf';
import type { GeneratePdfTermsInput } from '@/modules/pdf/schemas';
import { lookupSchema, type Lookup } from '@/modules/project/schemas/lookup.schema';
import {
  rfqAttachmentSchema,
  rfqDetailSchema,
  rfqPaginatedResponseSchema,
  rfqStatsSchema,
  rfqStatusSchema,
  type CreateRFQInput,
  type ListRFQParams,
  type RFQDeliverableInput,
  type RFQDetail,
  type RFQPaginatedResponse,
  type RFQStats,
  type RFQStatus,
  type UpdateRFQInput,
  type VoidAwardInput,
} from '@/modules/project/schemas/rfq';
import { z } from 'zod';

export type BidComparisonQuote = {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  status: { id: string; name: string; label: string } | null;
  totalAmount: number | null;
  negotiationAmount?: number | null;
  vendorCoupon?: boolean;
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
type RFQMutableState = 'DRAFT' | 'PUBLISHED';

type RFQApiObject = Record<string, unknown>;
type RFQApiType = RFQApiObject & { id?: string; label?: string };
type RFQApiDeliverable = RFQApiObject & {
  unit?: string | RFQApiType | null;
  unitId?: string | null;
  name?: string | null;
  description?: string | null;
};
type RFQApiVendorQuote = RFQApiObject & {
  vendor?: unknown;
  vendorId?: string | null;
  hasSubmittedQuote?: boolean | null;
  quotedAmount?: unknown;
  negotiationAmount?: unknown;
  vendorCoupon?: boolean | null;
  leadTime?: string | number | null;
  notes?: string | null;
};
type RFQApiResponse = RFQApiObject & {
  track?: string | null;
  type?: RFQApiType | null;
  typeId?: string | null;
  deliverables?: unknown;
  rfqdeliverables?: unknown;
  vendorQuotes?: unknown;
  quotes?: unknown;
  status?: unknown;
  attachments?: unknown;
  rfqattachments?: unknown;
};

function isRecord(value: unknown): value is RFQApiObject {
  return typeof value === 'object' && value !== null;
}

function toArray<T extends RFQApiObject>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(isRecord).map((item) => item as T) : [];
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeRFQ(item: unknown) {
  if (!isRecord(item)) return item;

  const record = item as RFQApiResponse;
  const type = isRecord(record.type) ? (record.type as RFQApiType) : undefined;

  // Derive track and typeId from nested type object if needed
  const track = record.track || type?.label || undefined;
  const typeId = record.typeId || type?.id || undefined;

  const deliverables = toArray<RFQApiDeliverable>(
    record.deliverables ?? record.rfqdeliverables
  ).map((d) => ({
    ...d,
    unitId: d.unitId ?? (isRecord(d.unit) ? getString(d.unit.id) : ''),
    unit: isRecord(d.unit) ? getString(d.unit.label) : getString(d.unit),
    description: getString(d.name) || getString(d.description),
    name: getString(d.name) || getString(d.description),
  }));

  // Normalize vendor quotes / invites
  const vendorQuotes = toArray<RFQApiVendorQuote>(record.vendorQuotes ?? record.quotes);
  const normalizedInvites = vendorQuotes.map((q) => ({
    ...q,
    vendor: q.vendor ?? (q.vendorId ? { id: q.vendorId } : undefined),
  }));

  const normalizedQuotes = vendorQuotes
    .filter((q) => q.hasSubmittedQuote || q.quotedAmount != null)
    .map((q) => {
      const leadTime = q.leadTime != null ? String(q.leadTime) : '';

      return {
        ...q,
        totalAmount: q.quotedAmount,
        grandTotal: q.quotedAmount,
        negotiationAmount: q.negotiationAmount,
        vendorCoupon: q.vendorCoupon ?? false,
        leadTimeDays: leadTime ? parseInt(leadTime, 10) : undefined,
        notes: leadTime ? `${leadTime} days` : q.notes,
        vendor: q.vendor ?? (q.vendorId ? { id: q.vendorId } : undefined),
      };
    });

  return {
    ...record,
    status:
      typeof record.status === 'string'
        ? { id: record.status, name: record.status, label: record.status }
        : record.status,
    track,
    typeId,
    deliverables,
    voidReason: record.voidReason ?? record.cancellationReason,
    attachments: record.attachments ?? record.rfqattachments,
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
    if (params.statusId) query.status = params.statusId;

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

  async stats(projectId: string): Promise<RFQStats> {
    const res = await api.get(`${BASE}/project/${projectId}/stats`);
    const raw = res.data?.data ?? res.data;
    const result = rfqStatsSchema.safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.stats] Zod parse error:', result.error.issues);
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

  async getTypes(): Promise<Lookup[]> {
    const res = await api.get('/lookup/type/TRADE_CATEGORY');
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) {
      console.error('[rfqApi.getTypes] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
    data: Partial<RFQDeliverableInput>
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

  async generateVendorPdf(
    quoteId: string,
    vendorName: string,
    data: GeneratePdfTermsInput = {}
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${BASE}/vendor/${quoteId}/pdf`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${vendorName || 'vendor'}-rfq.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  async saveVendorPdf(
    quoteId: string,
    vendorName: string,
    data: GeneratePdfTermsInput = {}
  ): Promise<GeneratedPdfFile> {
    const res = await api.post<Blob>(`${BASE}/vendor/${quoteId}/pdf/save`, data, {
      responseType: 'blob',
      timeout: 0,
    });
    const fallbackName = sanitizeDownloadName(`${vendorName || 'vendor'}-rfq.pdf`);

    return getGeneratedPdfFileFromResponse(res, fallbackName);
  },

  /* ---- Invite actions ---- */

  async declineInvite(data: { id: string; declineReason?: string }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/decline-quote`, data);
    return res.data?.data ?? res.data;
  },

  /* ---- Bid comparison ---- */

  async getBidComparison(rfqId: string): Promise<BidComparison> {
    const res = await api.get(`${BASE}/${rfqId}/bid-comparison`);
    const raw = res.data?.data ?? res.data;
    return raw as BidComparison;
  },

  /* ---- Quotes ---- */

  async submitQuote(data: {
    id: string;
    quotedAmount: number;
    negotiationAmount?: number | null;
    vendorCoupon?: boolean;
    leadTime?: string;
    attachments: string[];
  }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/submit-quote`, data);
    return res.data?.data ?? res.data;
  },

  async editQuote(data: {
    id: string;
    quotedAmount: number;
    negotiationAmount?: number | null;
    vendorCoupon?: boolean;
    leadTime?: string;
    attachments: string[];
  }): Promise<unknown> {
    const res = await api.patch(`${BASE}/vendor/edit-quote`, data);
    return res.data?.data ?? res.data;
  },

  async removeQuote(id: string): Promise<void> {
    await api.patch(`${BASE}/vendor/remove-quote`, { id });
  },

  /* ---- Status ---- */

  async changeStatus(id: string, statusName: RFQMutableState): Promise<RFQDetail> {
    const endpoint = statusName === 'DRAFT' ? 'set-draft' : 'set-published';
    const res = await api.patch(`${BASE}/${id}/${endpoint}`);
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

  async award(quoteId: string, data?: { negotiationAmount?: number | null }): Promise<RFQDetail> {
    const res = await api.patch(`${BASE}/award`, { quoteId, ...data });
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
