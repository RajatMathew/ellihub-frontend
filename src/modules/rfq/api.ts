import { api } from '@app/api';

import type {
  BidComparison,
  RFQ,
  RFQCreateRequest,
  RFQDeliverable,
  RFQListItem,
  RFQUpdateRequest,
  VendorQuotation,
} from './types';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface RFQListParams {
  page?: number;
  perPage?: number;
  projectId?: string;
  status?: string;
  tradeCategory?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeliverableCreateRequest {
  description: string;
  qty: number;
  unit: string;
  estimatedUnitPrice?: number;
  sequenceNumber: number;
}

export interface DeliverableUpdateRequest extends Partial<DeliverableCreateRequest> {}

export interface QuotationCreateRequest {
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  warrantyInfo?: string;
  deliveryDate?: string;
  notes?: string;
  lineItems: {
    deliverableId: string;
    unitPrice: number;
    amount: number;
    notes?: string;
  }[];
}

export interface QuotationUpdateRequest extends Partial<QuotationCreateRequest> {}

export interface AwardRFQRequest {
  vendorId: string;
  quotationId: string;
  notes?: string;
}

export interface AwardRFQResponse {
  rfq: RFQ;
  purchaseOrder: {
    id: string;
    poNumber: string;
    rfqId: string;
    vendorId: string;
    totalAmount: number;
    currency: string;
    status: string;
    createdAt: string;
  };
}

// ---------------------------------------------------------------------------
// RFQ
// ---------------------------------------------------------------------------

export async function getRFQs(
  params?: RFQListParams,
): Promise<PaginatedResponse<RFQListItem>> {
  const { data } = await api.get<PaginatedResponse<RFQListItem>>('/rfqs', { params });
  return data;
}

export async function getRFQ(id: string): Promise<RFQ> {
  const { data } = await api.get<RFQ>(`/rfqs/${id}`);
  return data;
}

export async function createRFQ(payload: RFQCreateRequest): Promise<RFQ> {
  const { data } = await api.post<RFQ>('/rfqs', payload);
  return data;
}

export async function updateRFQ(id: string, payload: RFQUpdateRequest): Promise<RFQ> {
  const { data } = await api.patch<RFQ>(`/rfqs/${id}`, payload);
  return data;
}

export async function deleteRFQ(id: string): Promise<void> {
  await api.delete(`/rfqs/${id}`);
}

export async function publishRFQ(id: string): Promise<RFQ> {
  const { data } = await api.post<RFQ>(`/rfqs/${id}/publish`);
  return data;
}

export async function closeRFQ(id: string): Promise<RFQ> {
  const { data } = await api.post<RFQ>(`/rfqs/${id}/close`);
  return data;
}

export async function awardRFQ(
  rfqId: string,
  payload: AwardRFQRequest,
): Promise<AwardRFQResponse> {
  const { data } = await api.post<AwardRFQResponse>(`/rfqs/${rfqId}/award`, payload);
  return data;
}

// ---------------------------------------------------------------------------
// Deliverables
// ---------------------------------------------------------------------------

export async function addDeliverable(
  rfqId: string,
  payload: DeliverableCreateRequest,
): Promise<RFQDeliverable> {
  const { data } = await api.post<RFQDeliverable>(`/rfqs/${rfqId}/deliverables`, payload);
  return data;
}

export async function updateDeliverable(
  rfqId: string,
  deliverableId: string,
  payload: DeliverableUpdateRequest,
): Promise<RFQDeliverable> {
  const { data } = await api.patch<RFQDeliverable>(
    `/rfqs/${rfqId}/deliverables/${deliverableId}`,
    payload,
  );
  return data;
}

export async function removeDeliverable(
  rfqId: string,
  deliverableId: string,
): Promise<void> {
  await api.delete(`/rfqs/${rfqId}/deliverables/${deliverableId}`);
}

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export async function submitQuotation(
  rfqId: string,
  payload: QuotationCreateRequest,
): Promise<VendorQuotation> {
  const { data } = await api.post<VendorQuotation>(`/rfqs/${rfqId}/quotations`, payload);
  return data;
}

export async function updateQuotation(
  rfqId: string,
  quotationId: string,
  payload: QuotationUpdateRequest,
): Promise<VendorQuotation> {
  const { data } = await api.patch<VendorQuotation>(
    `/rfqs/${rfqId}/quotations/${quotationId}`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Bid comparison (BE-RFQ-06)
// ---------------------------------------------------------------------------

export async function getBidComparison(rfqId: string): Promise<BidComparison> {
  const { data } = await api.get<BidComparison>(`/rfqs/${rfqId}/bid-comparison`);
  return data;
}
