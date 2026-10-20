import {
  importSourceSchema,
  optionalImportSourceSchema,
  paymentSourceSchema,
} from '@/app/lib/import-source';
import { quickBooksVendorMappingSchema } from '@/modules/integrations/schemas/quickbooks.schema';
import { z } from 'zod';

export const monthlyBillVendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  quickBooksMapping: quickBooksVendorMappingSchema.nullable().optional(),
});

export const monthlyBillSubChangeOrderSchema = z.object({
  id: z.string(),
  scoNumber: z.string(),
  amount: z.coerce.number(),
});

export type MonthlyBillSubChangeOrder = z.infer<typeof monthlyBillSubChangeOrderSchema>;

export const monthlyBillPurchaseOrderSchema = z.object({
  importSource: optionalImportSourceSchema,
  id: z.string(),
  poNumber: z.string(),
  vendor: monthlyBillVendorSchema,
  issuedAt: z.string().nullable().optional(),
  subChangeOrders: z.array(monthlyBillSubChangeOrderSchema).default([]),
});

export const monthlyBillPlannedPaymentSchema = z.object({
  amount: z.coerce.number(),
  isReady: z.boolean(),
});

export const monthlyBillPaymentSchema = z.object({
  id: z.string(),
  txnDate: z.string().nullable().optional(),
  amount: z.coerce.number().optional(),
  /** IMPORT: from a migration workbook; MANUAL: recorded by hand. Neither is in QuickBooks. */
  source: paymentSourceSchema.optional(),
  /** The payment reference as recorded, e.g. the workbook's CHK# cell. */
  reference: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  checkNumber: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  transactionUrl: z.string().nullable().optional(),
  /** The ElliHub bank account an imported or manual payment was paid from. */
  bankAccountName: z.string().nullable().optional(),
  /** Who recorded a manual payment. */
  recordedByName: z.string().nullable().optional(),
  importSource: importSourceSchema.nullable().optional(),
});

export type MonthlyBillPayment = z.infer<typeof monthlyBillPaymentSchema>;

export const monthlyBillItemSchema = z.object({
  purchaseOrder: monthlyBillPurchaseOrderSchema,
  original: z.coerce.number(),
  balance: z.coerce.number(),
  totalPaid: z.coerce.number(),
  plannedPayment: monthlyBillPlannedPaymentSchema.nullable().optional(),
  payments: z.array(monthlyBillPaymentSchema).default([]),
});

export type MonthlyBillItem = z.infer<typeof monthlyBillItemSchema>;

export const monthlyBillProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  jobNumber: z.string().nullable(),
});

export const monthlyBillProjectGroupSchema = z.object({
  project: monthlyBillProjectSchema,
  bills: z.array(monthlyBillItemSchema),
});

export type MonthlyBillProjectGroup = z.infer<typeof monthlyBillProjectGroupSchema>;

export const monthlyBillProjectGroupsSchema = z.array(monthlyBillProjectGroupSchema);

export const monthlyBillsPeriodMetaSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  label: z.string(),
  isCurrent: z.boolean(),
  minTxnDate: z.string(),
  maxTxnDate: z.string(),
  defaultTxnDate: z.string(),
});

export type MonthlyBillsPeriodMeta = z.infer<typeof monthlyBillsPeriodMetaSchema>;

export const monthlyBillsCapabilitiesSchema = z.object({
  canUpdateBills: z.boolean(),
  canMarkPayment: z.boolean(),
});

export const monthlyBillsSummarySchema = z.object({
  projectCount: z.coerce.number(),
  billCount: z.coerce.number(),
  balance: z.coerce.number(),
  planned: z.coerce.number(),
  paidThisMonth: z.coerce.number(),
  readyCount: z.coerce.number(),
});

export type MonthlyBillsSummary = z.infer<typeof monthlyBillsSummarySchema>;

export const monthlyBillsPaidSummarySchema = z.object({
  period: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int(),
    label: z.string(),
  }),
  materialPosPaid: z.coerce.number(),
  subcontractorPosPaid: z.coerce.number(),
  totalPaid: z.coerce.number(),
});

export type MonthlyBillsPaidSummary = z.infer<typeof monthlyBillsPaidSummarySchema>;

export const monthlyBillsPaginationSchema = z.object({
  currentPage: z.coerce.number(),
  totalPages: z.coerce.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  totalItems: z.coerce.number(),
  itemsPerPage: z.coerce.number(),
});

export type MonthlyBillsPagination = z.infer<typeof monthlyBillsPaginationSchema>;

export const monthlyBillsResponseSchema = z.object({
  groups: monthlyBillProjectGroupsSchema,
  meta: z.object({
    period: monthlyBillsPeriodMetaSchema,
    capabilities: monthlyBillsCapabilitiesSchema,
    summary: monthlyBillsSummarySchema,
    pagination: monthlyBillsPaginationSchema,
  }),
});

export type MonthlyBillsResponse = z.infer<typeof monthlyBillsResponseSchema>;

export const upsertPlannedPaymentSchema = z
  .object({
    purchaseOrderId: z.string(),
    month: z.number().int().min(1).max(12),
    year: z.number().int(),
    amount: z.number().nonnegative(),
    isReady: z.boolean().optional(),
  })
  .refine((value) => value.isReady !== true || value.amount > 0, {
    message: 'Ready bills must have a planned payment amount greater than zero.',
    path: ['isReady'],
  });

export type UpsertPlannedPaymentPayload = z.infer<typeof upsertPlannedPaymentSchema>;

export const bulkUpsertPlannedPaymentsSchema = z.object({
  items: z.array(upsertPlannedPaymentSchema).min(1).max(500),
});

export type BulkUpsertPlannedPaymentsPayload = z.infer<typeof bulkUpsertPlannedPaymentsSchema>;

export const plannedPaymentRecordSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  month: z.number(),
  year: z.number(),
  amount: z.coerce.number(),
  isReady: z.boolean(),
});

export type PlannedPaymentRecord = z.infer<typeof plannedPaymentRecordSchema>;

// Matches the backend PATCH /monthly-bills/mark-payment contract. The amount is derived
// server-side from the ready planned payment. No check/document number is sent.
export const markPaymentSchema = z.object({
  purchaseOrderId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  description: z.string().trim().min(1, 'Line item description is required.').max(4000),
  memo: z.string().trim().max(4000).optional().default(''),
  /** Confirmed QuickBooks payee reference id. */
  qbVendorId: z.string().min(1),
  /** QuickBooks bank account reference id. */
  bankAccountId: z.string().min(1),
  /** QuickBooks line-item category reference id. */
  categoryId: z.string().min(1),
  saveVendorMapping: z.boolean().optional().default(false),
  printLater: z.boolean().optional().default(false),
});

export type MarkPaymentPayload = z.infer<typeof markPaymentSchema>;

const monthlyBillPaymentStateSchema = z.object({
  purchaseOrderId: z.string(),
  totalPaid: z.coerce.number(),
  balance: z.coerce.number(),
  fullyPaid: z.boolean(),
});

/**
 * A payment just recorded, QuickBooks or manual. A manual one has no QuickBooks
 * vendor, bank account or transaction, so those are absent on it.
 */
export const markPaymentResultSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  amount: z.coerce.number(),
  source: paymentSourceSchema.optional(),
  qbVendorId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  txnDate: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  checkNumber: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  transactionUrl: z.string().nullable().optional(),
  billState: monthlyBillPaymentStateSchema.extend({
    plannedPayment: monthlyBillPlannedPaymentSchema,
  }),
});

export type MarkPaymentResult = z.infer<typeof markPaymentResultSchema>;

// The user-editable portion of the mark-payment form. purchaseOrderId/month/year come from the
// selected bill's context, so they live outside the form and are merged in on submit.
export const markPaymentFormSchema = z.object({
  qbVendorId: z.string().min(1, 'Select the QuickBooks vendor.'),
  bankAccountId: z.string().min(1, 'Select the bank account.'),
  categoryId: z.string().min(1, 'Select the category.'),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  description: z.string().trim().min(1, 'Line item description is required.').max(4000),
  memo: z.string().trim().max(4000),
  saveVendorMapping: z.boolean(),
  printLater: z.boolean(),
});

export type MarkPaymentFormData = z.infer<typeof markPaymentFormSchema>;

/**
 * Matches PATCH /monthly-bills/mark-manual-payment: a payment made outside
 * QuickBooks (check, wire, card). The amount is the ready planned payment's.
 */
export const markManualPaymentSchema = z.object({
  purchaseOrderId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  /** An ElliHub bank account, if known. */
  bankAccountId: z.string().nullable().optional(),
  reference: z.string().trim().max(255).optional().default(''),
  memo: z.string().trim().max(4000).optional().default(''),
});

export type MarkManualPaymentPayload = z.infer<typeof markManualPaymentSchema>;

export const markManualPaymentFormSchema = z.object({
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  bankAccountId: z.string(),
  reference: z.string().trim().max(255, 'Reference must be 255 characters or fewer.'),
  memo: z.string().trim().max(4000),
});

export type MarkManualPaymentFormData = z.infer<typeof markManualPaymentFormSchema>;

/** What a PO has been paid once a manual payment is deleted. */
export const deletedPaymentResultSchema = monthlyBillPaymentStateSchema;

export type DeletedPaymentResult = z.infer<typeof deletedPaymentResultSchema>;

/** ElliHub's own bank accounts, for naming the account a manual payment came from. */
export const monthlyBillBankAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export type MonthlyBillBankAccount = z.infer<typeof monthlyBillBankAccountSchema>;

/**
 * Matches POST /monthly-bills/purchase-orders/:purchaseOrderId/manual-payment:
 * a payment made outside QuickBooks, recorded from the purchase order page for
 * the amount given, dated in the current month or an earlier one.
 */
export const poManualPaymentPayloadSchema = z.object({
  amount: z.number().positive(),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankAccountId: z.string().nullable(),
  reference: z.string(),
  memo: z.string(),
});

export type PoManualPaymentPayload = z.infer<typeof poManualPaymentPayloadSchema>;

/** A PO payment just recorded; the PO may have had no planned payment that month. */
export const poManualPaymentResultSchema = markPaymentResultSchema.extend({
  billState: monthlyBillPaymentStateSchema.extend({
    plannedPayment: monthlyBillPlannedPaymentSchema.nullable(),
  }),
});

export type PoManualPaymentResult = z.infer<typeof poManualPaymentResultSchema>;

/** The PO page's manual payment form: the amount, held to the PO's balance. */
export function createPoManualPaymentFormSchema(
  balance: number,
  dateBounds?: { minTxnDate: string; maxTxnDate: string } | null
) {
  return markManualPaymentFormSchema
    .extend({
      amount: z
        .number({ error: 'Enter the amount paid.' })
        .positive('Enter an amount greater than zero.')
        .max(balance, 'The amount cannot be more than the remaining balance.'),
    })
    .refine(
      // ISO dates compare as strings. The date picker's min/max are only hints
      // a typed date can ignore; the server refuses one outside them too.
      (values) =>
        !dateBounds ||
        (values.txnDate >= dateBounds.minTxnDate && values.txnDate <= dateBounds.maxTxnDate),
      {
        path: ['txnDate'],
        message: 'Pick a date between the month the PO was issued and the end of this month.',
      }
    );
}

export type PoManualPaymentFormData = z.infer<ReturnType<typeof createPoManualPaymentFormSchema>>;
