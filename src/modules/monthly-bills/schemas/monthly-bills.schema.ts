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
  transactionId: z.string().nullable().optional(),
  transactionUrl: z.string().nullable().optional(),
});

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
});

export type MarkPaymentPayload = z.infer<typeof markPaymentSchema>;

export const markPaymentResultSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  amount: z.coerce.number(),
  qbVendorId: z.string(),
  bankAccountId: z.string(),
  txnDate: z.string().nullable().optional(),
  transactionId: z.string(),
  transactionUrl: z.string(),
});

export type MarkPaymentResult = z.infer<typeof markPaymentResultSchema>;

// The user-editable portion of the mark-payment form. purchaseOrderId/month/year come from the
// selected bill's context, so they live outside the form and are merged in on submit.
export const markPaymentFormSchema = z.object({
  qbVendorId: z.string().min(1),
  bankAccountId: z.string().min(1),
  categoryId: z.string().min(1),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required.'),
  description: z.string().trim().min(1, 'Line item description is required.').max(4000),
  memo: z.string().trim().max(4000),
  saveVendorMapping: z.boolean(),
});

export type MarkPaymentFormData = z.infer<typeof markPaymentFormSchema>;
