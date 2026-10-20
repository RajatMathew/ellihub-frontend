import api from '@/app/api';
import {
  deletedPaymentResultSchema,
  markPaymentResultSchema,
  monthlyBillBankAccountSchema,
  monthlyBillsPaidSummarySchema,
  monthlyBillsResponseSchema,
  plannedPaymentRecordSchema,
  poManualPaymentResultSchema,
  type BulkUpsertPlannedPaymentsPayload,
  type DeletedPaymentResult,
  type MarkManualPaymentPayload,
  type MarkPaymentPayload,
  type MarkPaymentResult,
  type MonthlyBillBankAccount,
  type MonthlyBillsPaidSummary,
  type MonthlyBillsResponse,
  type PlannedPaymentRecord,
  type PoManualPaymentPayload,
  type PoManualPaymentResult,
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

  /** A payment made outside QuickBooks; needs no QuickBooks connection. */
  async markManualPayment(payload: MarkManualPaymentPayload): Promise<MarkPaymentResult> {
    const res = await api.patch(`${BASE}/mark-manual-payment`, payload);
    const raw = res.data?.data ?? res.data;
    const result = markPaymentResultSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  /** A payment made outside QuickBooks, from the PO page: any amount, this month or earlier. */
  async recordPurchaseOrderManualPayment(
    purchaseOrderId: string,
    payload: PoManualPaymentPayload
  ): Promise<PoManualPaymentResult> {
    const res = await api.post(
      `${BASE}/purchase-orders/${encodeURIComponent(purchaseOrderId)}/manual-payment`,
      payload
    );
    const raw = res.data?.data ?? res.data;
    const result = poManualPaymentResultSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  /** Only a payment recorded by hand can be deleted. */
  async deleteManualPayment(paymentId: string): Promise<DeletedPaymentResult> {
    const res = await api.delete(`${BASE}/payments/${encodeURIComponent(paymentId)}`);
    const raw = res.data?.data ?? res.data;
    const result = deletedPaymentResultSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async listBankAccounts(): Promise<MonthlyBillBankAccount[]> {
    const res = await api.get(`${BASE}/bank-accounts`);
    const raw = res.data?.data ?? res.data;
    const result = z.array(monthlyBillBankAccountSchema).safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
