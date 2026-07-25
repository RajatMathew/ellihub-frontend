import api from '@/app/api';
import {
  acceptQuickBooksPaymentResultSchema,
  paymentConflictListResponseSchema,
  paymentConflictSchema,
  paymentConflictSyncResultSchema,
  type AcceptQuickBooksPaymentResult,
  type PaymentConflict,
  type PaymentConflictListResponse,
  type PaymentConflictSeverity,
  type PaymentConflictStatus,
  type PaymentConflictSyncResult,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';

const BASE = '/integrations/quickbooks/payment-conflicts';

export interface ListPaymentConflictsParams {
  status: PaymentConflictStatus;
  severity?: PaymentConflictSeverity;
  search?: string;
  page?: number;
  size?: number;
}

export const paymentConflictsApi = {
  async list(params: ListPaymentConflictsParams): Promise<PaymentConflictListResponse> {
    const response = await api.get(BASE, { params });
    return paymentConflictListResponseSchema.parse(response.data?.data ?? response.data);
  },

  async getById(conflictId: string): Promise<PaymentConflict> {
    const response = await api.get(`${BASE}/${encodeURIComponent(conflictId)}`);
    return paymentConflictSchema.parse(response.data?.data ?? response.data);
  },

  async recheck(conflictId: string): Promise<PaymentConflict> {
    const response = await api.post(`${BASE}/${encodeURIComponent(conflictId)}/recheck`);
    return paymentConflictSchema.parse(response.data?.data ?? response.data);
  },

  async acceptQuickBooks(conflictId: string): Promise<AcceptQuickBooksPaymentResult> {
    const response = await api.post(`${BASE}/${encodeURIComponent(conflictId)}/accept-quickbooks`);
    return acceptQuickBooksPaymentResultSchema.parse(response.data?.data ?? response.data);
  },

  async sync(): Promise<PaymentConflictSyncResult> {
    const response = await api.patch(`${BASE}/sync`);
    return paymentConflictSyncResultSchema.parse(response.data?.data ?? response.data);
  },
};
