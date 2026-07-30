import api from '@/app/api';
import {
  recurringBillPaymentSchema,
  recurringBillsResponseSchema,
  type CreateRecurringBillRulePayload,
  type PayRecurringBillPayload,
  type RecurringBillPayment,
  type RecurringBillsResponse,
  type SkipRecurringBillMonthPayload,
  type SkipRecurringBillPayload,
  type ToggleRecurringBillRulePayload,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import { RECURRING_BILLS_QA_DATE_HEADER } from '@/modules/monthly-bills/testing/recurring-bills-qa-clock';
import { z } from 'zod';

const BASE = '/monthly-bills/recurring';

export interface RecurringBillsQueryParams {
  month: number;
  year: number;
  page?: number;
  size?: number;
  search?: string;
  status?: string[];
  vendorId?: string[];
  // TEMP_RECURRING_BILLS_QA_CLOCK: query-key input only; sent as a request header.
  qaDate?: string;
}

function toQuery(params: RecurringBillsQueryParams): Record<string, string | number> {
  const { month, year, page, size, search, status, vendorId } = params;
  const query: Record<string, string | number> = { month, year };
  if (page) query.page = page;
  if (size) query.size = size;
  if (search) query.search = search;
  if (status?.length) query.status = status.join(',');
  if (vendorId?.length) query.vendorId = vendorId.join(',');
  return query;
}

// TEMP_RECURRING_BILLS_QA_CLOCK: isolated request header; no global Axios clock state.
function withQaClock(qaDate?: string) {
  return qaDate
    ? {
        headers: {
          [RECURRING_BILLS_QA_DATE_HEADER]: qaDate,
        },
      }
    : {};
}

export const recurringBillsApi = {
  async list(params: RecurringBillsQueryParams): Promise<RecurringBillsResponse> {
    const res = await api.get(BASE, { params: toQuery(params), ...withQaClock(params.qaDate) });
    const raw = res.data?.data ?? res.data;
    const result = recurringBillsResponseSchema.safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },

  async create(payload: CreateRecurringBillRulePayload, qaDate?: string): Promise<unknown> {
    const res = await api.post(BASE, payload, withQaClock(qaDate));
    return res.data?.data ?? res.data;
  },

  async update(ruleId: string, payload: CreateRecurringBillRulePayload): Promise<unknown> {
    const res = await api.patch(`${BASE}/${ruleId}`, payload);
    return res.data?.data ?? res.data;
  },

  async toggle(ruleId: string, payload: ToggleRecurringBillRulePayload): Promise<unknown> {
    const res = await api.patch(`${BASE}/${ruleId}/active`, payload);
    return res.data?.data ?? res.data;
  },

  async skip(ruleId: string, payload: SkipRecurringBillPayload): Promise<unknown> {
    const res = await api.post(`${BASE}/${ruleId}/skip`, payload);
    return res.data?.data ?? res.data;
  },

  async skipMonth(ruleId: string, payload: SkipRecurringBillMonthPayload): Promise<unknown> {
    const res = await api.post(`${BASE}/${ruleId}/skip-month`, payload);
    return res.data?.data ?? res.data;
  },

  async delete(ruleId: string): Promise<unknown> {
    const res = await api.delete(`${BASE}/${ruleId}`);
    return res.data?.data ?? res.data;
  },

  async pay(
    ruleId: string,
    payload: PayRecurringBillPayload,
    qaDate?: string
  ): Promise<RecurringBillPayment> {
    const res = await api.post(`${BASE}/${ruleId}/pay`, payload, withQaClock(qaDate));
    const raw = res.data?.data ?? res.data;
    const result = recurringBillPaymentSchema
      .extend({
        ruleId: z.string().optional(),
        occurrenceId: z.string().nullable().optional(),
        cycleKey: z.string().optional(),
        qbVendorId: z.string().optional(),
        bankAccountId: z.string().optional(),
        categoryId: z.string().optional(),
      })
      .passthrough()
      .safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },
};
