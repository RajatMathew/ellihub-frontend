import { z } from 'zod';

export const recurringBillFrequencySchema = z.enum([
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

export const recurringBillScheduleTimingSchema = z.enum(['start', 'date', 'end']);
export const recurringBillAmountModeSchema = z.enum(['fixed', 'variable']);
export const recurringBillStatusSchema = z.enum(['due', 'paid', 'skipped', 'cancelled', 'failed']);

export const recurringBillPaymentSchema = z.object({
  id: z.string(),
  amount: z.coerce.number(),
  txnDate: z.string(),
  transactionId: z.string(),
  transactionUrl: z.string(),
  printLater: z.boolean(),
  invoiceDocumentId: z.string().nullable(),
});

export const recurringBillItemSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  name: z.string(),
  vendorId: z.string(),
  vendorName: z.string(),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  frequency: recurringBillFrequencySchema,
  scheduleTiming: recurringBillScheduleTimingSchema,
  weeklyDay: z.number().nullable().optional(),
  customIntervalMonths: z.number().nullable().optional(),
  amountMode: recurringBillAmountModeSchema,
  defaultAmount: z.coerce.number(),
  dueDay: z.number(),
  startsOn: z.string().nullable().optional(),
  endsOn: z.string().nullable().optional(),
  dueDate: z.string(),
  cycleKey: z.string(),
  status: recurringBillStatusSchema,
  isActive: z.boolean(),
  payment: recurringBillPaymentSchema.nullable(),
});

export const recurringBillGroupSummarySchema = z.object({
  occurrenceCount: z.coerce.number(),
  dueCount: z.coerce.number(),
  paidCount: z.coerce.number(),
  skippedCount: z.coerce.number(),
  plannedAmount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  isCompleteForPeriod: z.boolean(),
});

export const recurringBillGroupSchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  vendorId: z.string(),
  vendorName: z.string(),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  frequency: recurringBillFrequencySchema,
  scheduleTiming: recurringBillScheduleTimingSchema,
  weeklyDay: z.number().nullable().optional(),
  customIntervalMonths: z.number().nullable().optional(),
  amountMode: recurringBillAmountModeSchema,
  defaultAmount: z.coerce.number(),
  dueDay: z.number(),
  startsOn: z.string().nullable().optional(),
  endsOn: z.string().nullable().optional(),
  isActive: z.boolean(),
  occurrences: z.array(recurringBillItemSchema),
  summary: recurringBillGroupSummarySchema,
});

export const recurringBillsSummarySchema = z.object({
  activeCount: z.coerce.number(),
  pausedCount: z.coerce.number(),
  scheduledCount: z.coerce.number(),
  plannedAmount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  paidCount: z.coerce.number(),
});

export const recurringBillsPaginationSchema = z.object({
  currentPage: z.coerce.number(),
  totalPages: z.coerce.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  totalItems: z.coerce.number(),
  itemsPerPage: z.coerce.number(),
});

export const recurringBillsPeriodSchema = z.object({
  month: z.number(),
  year: z.number(),
  label: z.string(),
  isCurrent: z.boolean(),
  minTxnDate: z.string(),
  maxTxnDate: z.string(),
  defaultTxnDate: z.string(),
});

export const recurringBillsCapabilitiesSchema = z.object({
  canUpdateBills: z.boolean(),
  canMarkPayment: z.boolean(),
});

export const recurringBillsResponseSchema = z.object({
  items: z.array(recurringBillItemSchema),
  groups: z.array(recurringBillGroupSchema).default([]),
  meta: z.object({
    period: recurringBillsPeriodSchema,
    capabilities: recurringBillsCapabilitiesSchema,
    // TEMP_RECURRING_BILLS_QA_CLOCK: server confirmation for the temporary override banner.
    qaClock: z
      .object({
        active: z.literal(true),
        effectiveDate: z.string(),
        actualDate: z.string(),
      })
      .optional(),
    summary: recurringBillsSummarySchema,
    pagination: recurringBillsPaginationSchema,
  }),
});

export const createRecurringBillRuleSchema = z.object({
  name: z.string().trim().min(1),
  vendorId: z.string().min(1),
  vendorName: z.string().min(1),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly', 'custom']),
  scheduleTiming: recurringBillScheduleTimingSchema,
  weeklyDay: z.number().int().min(1).max(7).optional(),
  customIntervalMonths: z.number().int().min(2).max(24).optional(),
  amountMode: recurringBillAmountModeSchema,
  defaultAmount: z.number().nonnegative(),
  dueDay: z.number().int().min(1).max(28),
  startsOn: z.string().optional(),
  anchorDate: z.string().optional(),
  endsOn: z.string().optional().nullable(),
});

export const toggleRecurringBillRuleSchema = z.object({
  isActive: z.boolean(),
});

export const payRecurringBillSchema = z.object({
  cycleKey: z.string(),
  dueDate: z.string(),
  amount: z.number().positive(),
  txnDate: z.string(),
  qbVendorId: z.string().min(1),
  bankAccountId: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().trim().min(1).max(4000),
  memo: z.string().trim().max(4000).optional().default(''),
  printLater: z.boolean().optional().default(false),
  invoiceDocumentId: z.string().optional().nullable(),
});

export const skipRecurringBillSchema = z.object({
  cycleKey: z.string(),
  dueDate: z.string(),
  reason: z.string().trim().max(1000).optional().default(''),
});

export const skipRecurringBillMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  reason: z.string().trim().max(1000).optional().default(''),
});

export type RecurringBillItem = z.infer<typeof recurringBillItemSchema>;
export type RecurringBillGroup = z.infer<typeof recurringBillGroupSchema>;
export type RecurringBillPayment = z.infer<typeof recurringBillPaymentSchema>;
export type RecurringBillsSummary = z.infer<typeof recurringBillsSummarySchema>;
export type RecurringBillsResponse = z.infer<typeof recurringBillsResponseSchema>;
export type CreateRecurringBillRulePayload = z.infer<typeof createRecurringBillRuleSchema>;
export type ToggleRecurringBillRulePayload = z.infer<typeof toggleRecurringBillRuleSchema>;
export type PayRecurringBillPayload = z.infer<typeof payRecurringBillSchema>;
export type SkipRecurringBillPayload = z.infer<typeof skipRecurringBillSchema>;
export type SkipRecurringBillMonthPayload = z.infer<typeof skipRecurringBillMonthSchema>;
