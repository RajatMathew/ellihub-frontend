import api from '@/app/api';
import {
  monthlyBillProjectGroupsSchema,
  markPaymentResultSchema,
  plannedPaymentRecordSchema,
  type MarkPaymentPayload,
  type MarkPaymentResult,
  type MonthlyBillProjectGroup,
  type PlannedPaymentRecord,
  type UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

const BASE = '/monthly-bills';

export interface MonthlyBillsQueryParams {
  /** Inclusive start of the period, ISO date (YYYY-MM-DD). */
  startDate: string;
  /** Inclusive end of the period, ISO date (YYYY-MM-DD). */
  endDate: string;
  /** 1-12. */
  month: number;
  year: number;
  /** Free-text match against PO number or vendor name. */
  search?: string;
  /** Filter to one or more vendors. */
  vendorId?: string[];
  /** Filter to one or more PO trade categories. */
  tradeCategoryId?: string[];
}

export const monthlyBillsApi = {
  // Identity (role + employee) is derived server-side from the auth session, so it is not sent here.
  async listMonthlyBills(params: MonthlyBillsQueryParams): Promise<MonthlyBillProjectGroup[]> {
    const { vendorId, tradeCategoryId, search, ...rest } = params;
    // The endpoint takes multi-select filters as a comma-separated list (e.g. ?vendorId=a,b).
    const query: Record<string, string | number> = { ...rest };
    if (search) query.search = search;
    if (vendorId?.length) query.vendorId = vendorId.join(',');
    if (tradeCategoryId?.length) query.tradeCategoryId = tradeCategoryId.join(',');

    const res = await api.get(BASE, { params: query });
    const raw = res.data?.data ?? res.data;
    const result = monthlyBillProjectGroupsSchema.safeParse(raw);
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
