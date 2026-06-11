import { z } from 'zod';

export const monthlyBillsSubcontractorPOSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  poNumber: z.string(),
  poDate: z.string(),
  amountTotal: z.coerce.number(),
  vendor: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type MonthlyBillsSubcontractorPO = z.infer<typeof monthlyBillsSubcontractorPOSchema>;

export const monthlyBillsSubcontractorPOGroupSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
  }),
  purchaseOrders: z.array(monthlyBillsSubcontractorPOSchema),
});

export type MonthlyBillsSubcontractorPOGroup = z.infer<
  typeof monthlyBillsSubcontractorPOGroupSchema
>;

export const monthlyBillsSubcontractorPOGroupsSchema = z.array(
  monthlyBillsSubcontractorPOGroupSchema
);
