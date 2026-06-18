import api from '@/app/api';
import {
  markPaymentResultSchema,
  monthlyBillsResponseSchema,
  plannedPaymentRecordSchema,
  type BulkUpsertPlannedPaymentsPayload,
  type MarkPaymentPayload,
  type MarkPaymentResult,
  type MonthlyBillsResponse,
  type PlannedPaymentRecord,
  type UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { z } from 'zod';

const BASE = '/monthly-bills';

export interface MonthlyBillsQueryParams {
  /** 1-12. */
  month: number;
  year: number;
  page?: number;
  size?: number;
  /** Free-text match against PO number or vendor name. */
  search?: string;
  /** Filter to one or more vendors. */
  vendorId?: string[];
  /** Filter to one or more PO trade categories. */
  tradeCategoryId?: string[];
}

export const monthlyBillsApi = {
  // Identity (role + employee) is derived server-side from the auth session, so it is not sent here.
  async listMonthlyBills(params: MonthlyBillsQueryParams): Promise<MonthlyBillsResponse> {
    const { vendorId, tradeCategoryId, search, ...rest } = params;
    // The endpoint takes multi-select filters as a comma-separated list (e.g. ?vendorId=a,b).
    const query: Record<string, string | number> = { ...rest };
    if (search) query.search = search;
    if (vendorId?.length) query.vendorId = vendorId.join(',');
    if (tradeCategoryId?.length) query.tradeCategoryId = tradeCategoryId.join(',');

    const res = await api.get(BASE, { params: query });
    const raw = res.data?.data ?? res.data;
    const result = monthlyBillsResponseSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async upsertPlannedPayment(payload: UpsertPlannedPaymentPayload): Promise<PlannedPaymentRecord> {
    const res = await api.put(`${BASE}/planned-payment`, payload);
    const raw = res.data?.data ?? res.data;
    const result = plannedPaymentRecordSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async bulkUpsertPlannedPayments(
    payload: BulkUpsertPlannedPaymentsPayload
  ): Promise<PlannedPaymentRecord[]> {
    const res = await api.put(`${BASE}/planned-payments/bulk`, payload);
    const raw = res.data?.data ?? res.data;
    const result = z.array(plannedPaymentRecordSchema).safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async markPayment(payload: MarkPaymentPayload): Promise<MarkPaymentResult> {
    const res = await api.patch(`${BASE}/mark-payment`, payload);
    const raw = res.data?.data ?? res.data;
    const result = markPaymentResultSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
