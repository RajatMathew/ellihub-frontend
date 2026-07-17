import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

import type { AppRole } from '@lib/access';

export const RecurringBillFrequencySchema = z.enum([
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly',
    'custom',
]);

export const RecurringBillScheduleTimingSchema = z.enum(['start', 'date', 'end']);
export const RecurringBillAmountModeSchema = z.enum(['fixed', 'variable']);
export const RecurringBillOccurrenceStatusSchema = z.enum([
    'due',
    'paid',
    'skipped',
    'cancelled',
    'failed',
]);

const csvStrings = z
    .string()
    .transform((value) =>
        value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    )
    .pipe(z.array(z.string().min(1)).min(1))
    .optional();

export const RecurringBillsQuerySchema = z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int(),
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().min(1).max(50).default(25),
    search: z.string().trim().min(1).max(200).optional(),
    status: csvStrings,
    vendorId: csvStrings,
});

export type RecurringBillsQueryRequest = z.infer<typeof RecurringBillsQuerySchema>;

const RecurringBillBaseMutationSchema = z.object({
    name: z.string().trim().min(1).max(200),
    vendorId: z.string().trim().min(1),
    vendorName: z.string().trim().min(1).max(200),
    bankAccountId: z.string().trim().min(1).optional().or(z.literal('')),
    bankAccountName: z.string().trim().max(200).optional().or(z.literal('')),
    categoryId: z.string().trim().min(1).optional().or(z.literal('')),
    categoryName: z.string().trim().max(200).optional().or(z.literal('')),
    frequency: RecurringBillFrequencySchema,
    scheduleTiming: RecurringBillScheduleTimingSchema,
    weeklyDay: z.number().int().min(1).max(7).optional(),
    customIntervalMonths: z.number().int().min(2).max(24).optional(),
    amountMode: RecurringBillAmountModeSchema,
    defaultAmount: z.number().nonnegative(),
    dueDay: z.number().int().min(1).max(28),
    anchorDate: z.iso.date().optional(),
    startsOn: z.iso.date().optional().nullable(),
    endsOn: z.iso.date().optional().nullable(),
    descriptionTemplate: z.string().trim().max(4000).optional().nullable(),
    memoTemplate: z.string().trim().max(4000).optional().nullable(),
});

export const CreateRecurringBillRuleSchema = RecurringBillBaseMutationSchema.refine(
    (value) => value.amountMode !== 'fixed' || value.defaultAmount > 0,
    {
        message: 'Fixed recurring bills must have an amount greater than zero.',
        path: ['defaultAmount'],
    }
)
    .refine(
        (value) => !['weekly', 'biweekly'].includes(value.frequency) || Boolean(value.weeklyDay),
        {
            message: 'Weekly and biweekly recurring bills must include a weekday.',
            path: ['weeklyDay'],
        }
    )
    .refine((value) => value.frequency !== 'custom' || Boolean(value.customIntervalMonths), {
        message: 'Custom recurring bills must include an interval.',
        path: ['customIntervalMonths'],
    });

export const UpdateRecurringBillRuleSchema = RecurringBillBaseMutationSchema.partial()
    .extend({
        isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required.',
    })
    .refine(
        (value) =>
            !['weekly', 'biweekly'].includes(value.frequency ?? '') || Boolean(value.weeklyDay),
        {
            message: 'Weekly and biweekly recurring bills must include a weekday.',
            path: ['weeklyDay'],
        }
    )
    .refine((value) => value.frequency !== 'custom' || Boolean(value.customIntervalMonths), {
        message: 'Custom recurring bills must include an interval.',
        path: ['customIntervalMonths'],
    });

export const ToggleRecurringBillRuleSchema = z.object({
    isActive: z.boolean(),
});

export const RecurringBillRuleParamSchema = z.object({
    ruleId: nanoIdSchema,
});

export const PayRecurringBillSchema = z.object({
    cycleKey: z.iso.date(),
    dueDate: z.iso.date(),
    amount: z.number().positive(),
    txnDate: z.iso.date(),
    qbVendorId: z.string().trim().min(1),
    bankAccountId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1),
    description: z.string().trim().min(1).max(4000),
    memo: z.string().trim().max(4000).optional().default(''),
    printLater: z.boolean().optional().default(false),
    invoiceDocumentId: nanoIdSchema.optional().nullable(),
});

export const SkipRecurringBillSchema = z.object({
    cycleKey: z.iso.date(),
    dueDate: z.iso.date(),
    reason: z.string().trim().max(1000).optional().default(''),
});

export const SkipRecurringBillMonthSchema = z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int(),
    reason: z.string().trim().max(1000).optional().default(''),
});

export type CreateRecurringBillRuleRequest = z.infer<typeof CreateRecurringBillRuleSchema>;
export type UpdateRecurringBillRuleRequest = z.infer<typeof UpdateRecurringBillRuleSchema>;
export type ToggleRecurringBillRuleRequest = z.infer<typeof ToggleRecurringBillRuleSchema>;
export type PayRecurringBillRequest = z.infer<typeof PayRecurringBillSchema>;
export type SkipRecurringBillRequest = z.infer<typeof SkipRecurringBillSchema>;
export type SkipRecurringBillMonthRequest = z.infer<typeof SkipRecurringBillMonthSchema>;

export interface RecurringBillsQuery extends RecurringBillsQueryRequest {
    userRole: AppRole;
    canUpdateMonthlyBills: boolean;
    canMarkMonthlyBills: boolean;
}

export interface RecurringBillMutationContext {
    userRole: AppRole;
    userId: string;
}

export interface CreateRecurringBillRuleInput
    extends CreateRecurringBillRuleRequest, RecurringBillMutationContext {}

export interface UpdateRecurringBillRuleInput
    extends UpdateRecurringBillRuleRequest, RecurringBillMutationContext {
    ruleId: string;
}

export interface ToggleRecurringBillRuleInput
    extends ToggleRecurringBillRuleRequest, RecurringBillMutationContext {
    ruleId: string;
}

export interface PayRecurringBillInput
    extends PayRecurringBillRequest, RecurringBillMutationContext {
    ruleId: string;
}

export interface SkipRecurringBillInput
    extends SkipRecurringBillRequest, RecurringBillMutationContext {
    ruleId: string;
}

export interface SkipRecurringBillMonthInput
    extends SkipRecurringBillMonthRequest, RecurringBillMutationContext {
    ruleId: string;
}

export interface RecurringBillPaymentResponse {
    id: string;
    amount: number;
    txnDate: string;
    transactionId: string;
    transactionUrl: string;
    printLater: boolean;
    invoiceDocumentId: string | null;
}

export interface RecurringBillItem {
    id: string;
    ruleId: string;
    name: string;
    vendorId: string;
    vendorName: string;
    categoryId?: string | null;
    categoryName?: string | null;
    bankAccountId?: string | null;
    bankAccountName?: string | null;
    frequency: z.infer<typeof RecurringBillFrequencySchema>;
    scheduleTiming: z.infer<typeof RecurringBillScheduleTimingSchema>;
    weeklyDay?: number | null;
    customIntervalMonths?: number | null;
    amountMode: z.infer<typeof RecurringBillAmountModeSchema>;
    defaultAmount: number;
    dueDay: number;
    startsOn?: string | null;
    endsOn?: string | null;
    dueDate: string;
    cycleKey: string;
    status: z.infer<typeof RecurringBillOccurrenceStatusSchema>;
    isActive: boolean;
    payment: RecurringBillPaymentResponse | null;
}

export interface RecurringBillGroupSummary {
    occurrenceCount: number;
    dueCount: number;
    paidCount: number;
    skippedCount: number;
    plannedAmount: number;
    paidAmount: number;
    isCompleteForPeriod: boolean;
}

export interface RecurringBillGroup {
    ruleId: string;
    name: string;
    vendorId: string;
    vendorName: string;
    categoryId?: string | null;
    categoryName?: string | null;
    bankAccountId?: string | null;
    bankAccountName?: string | null;
    frequency: z.infer<typeof RecurringBillFrequencySchema>;
    scheduleTiming: z.infer<typeof RecurringBillScheduleTimingSchema>;
    weeklyDay?: number | null;
    customIntervalMonths?: number | null;
    amountMode: z.infer<typeof RecurringBillAmountModeSchema>;
    defaultAmount: number;
    dueDay: number;
    startsOn?: string | null;
    endsOn?: string | null;
    isActive: boolean;
    occurrences: RecurringBillItem[];
    summary: RecurringBillGroupSummary;
}

export interface RecurringBillsSummary {
    activeCount: number;
    pausedCount: number;
    scheduledCount: number;
    plannedAmount: number;
    paidAmount: number;
    paidCount: number;
}

export interface RecurringBillsResponse {
    items: RecurringBillItem[];
    groups: RecurringBillGroup[];
    meta: {
        period: {
            month: number;
            year: number;
            label: string;
            isCurrent: boolean;
            minTxnDate: string;
            maxTxnDate: string;
            defaultTxnDate: string;
        };
        capabilities: {
            canUpdateBills: boolean;
            canMarkPayment: boolean;
        };
        summary: RecurringBillsSummary;
        pagination: {
            currentPage: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            totalItems: number;
            itemsPerPage: number;
        };
    };
}
