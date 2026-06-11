import { z } from 'zod';

export const monthlyBillVendorSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const monthlyBillPurchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  vendor: monthlyBillVendorSchema,
  issuedAt: z.string().nullable().optional(),
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

export const upsertPlannedPaymentSchema = z.object({
  purchaseOrderId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  amount: z.number().nonnegative(),
  isReady: z.boolean().optional(),
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
