import api from '@/app/api';
import {
  markPaymentResultSchema,
  monthlyBillsPaidSummarySchema,
  monthlyBillsResponseSchema,
  plannedPaymentRecordSchema,
  type BulkUpsertPlannedPaymentsPayload,
  type MarkPaymentPayload,
  type MarkPaymentResult,
  type MonthlyBillsPaidSummary,
  type MonthlyBillsResponse,
  type PlannedPaymentRecord,
  type UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { z } from 'zod';

const BASE = '/monthly-bills';

export interface MonthlyBillsSummaryQueryParams {
  month: number;
  year: number;
  /** Filter to one or more vendors. */
  vendorId?: string[];
  /** Filter to one or more PO trade categories. */
  tradeCategoryId?: string[];
}

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

function serializeMonthlyBillsQueryParams(
  params: MonthlyBillsSummaryQueryParams | MonthlyBillsQueryParams
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    month: params.month,
    year: params.year,
  };

  if ('page' in params && params.page !== undefined) query.page = params.page;
  if ('size' in params && params.size !== undefined) query.size = params.size;
  if ('search' in params && params.search) query.search = params.search;
  if (params.vendorId?.length) query.vendorId = params.vendorId.join(',');
  if (params.tradeCategoryId?.length) query.tradeCategoryId = params.tradeCategoryId.join(',');

  return query;
}

export const monthlyBillsApi = {
  async getSummary(params: MonthlyBillsSummaryQueryParams): Promise<MonthlyBillsPaidSummary> {
    const res = await api.get(`${BASE}/summary`, {
      params: serializeMonthlyBillsQueryParams(params),
    });
    const raw = res.data?.data ?? res.data;
    const result = monthlyBillsPaidSummarySchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  // Identity (role + employee) is derived server-side from the auth session, so it is not sent here.
  async listMonthlyBills(params: MonthlyBillsQueryParams): Promise<MonthlyBillsResponse> {
    const res = await api.get(BASE, { params: serializeMonthlyBillsQueryParams(params) });
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
