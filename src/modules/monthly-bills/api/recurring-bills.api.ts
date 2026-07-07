import api from '@/app/api';
import {
  recurringBillsResponseSchema,
  recurringBillPaymentSchema,
  type CreateRecurringBillRulePayload,
  type PayRecurringBillPayload,
  type RecurringBillPayment,
  type RecurringBillsResponse,
  type SkipRecurringBillPayload,
  type ToggleRecurringBillRulePayload,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';
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
}

function toQuery(params: RecurringBillsQueryParams): Record<string, string | number> {
  const { search, status, vendorId, ...rest } = params;
  const query: Record<string, string | number> = { ...rest };
  if (search) query.search = search;
  if (status?.length) query.status = status.join(',');
  if (vendorId?.length) query.vendorId = vendorId.join(',');
  return query;
}

export const recurringBillsApi = {
  async list(params: RecurringBillsQueryParams): Promise<RecurringBillsResponse> {
    const res = await api.get(BASE, { params: toQuery(params) });
    const raw = res.data?.data ?? res.data;
    const result = recurringBillsResponseSchema.safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },

  async create(payload: CreateRecurringBillRulePayload): Promise<unknown> {
    const res = await api.post(BASE, payload);
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

  async delete(ruleId: string): Promise<unknown> {
    const res = await api.delete(`${BASE}/${ruleId}`);
    return res.data?.data ?? res.data;
  },

  async pay(ruleId: string, payload: PayRecurringBillPayload): Promise<RecurringBillPayment> {
    const res = await api.post(`${BASE}/${ruleId}/pay`, payload);
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



