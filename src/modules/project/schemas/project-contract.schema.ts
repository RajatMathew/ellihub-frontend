import { z } from 'zod';

export const paymentTermsSchema = z.enum([
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'DUE_ON_RECEIPT',
]);

export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

export const primeContractSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    contractValue: z.coerce.number(),
    contractType: z.string().nullable().optional(),
    retainagePercent: z.coerce.number().nullable().optional(),
    targetBudgetPercent: z.coerce.number().nullable().optional(),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    estimatedStartDate: z.string().nullable().optional(),
    estimatedCompletionDate: z.string().nullable().optional(),
    actualStartDate: z.string().nullable().optional(),
    actualCompletionDate: z.string().nullable().optional(),
    executedContractDocId: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PrimeContract = z.infer<typeof primeContractSchema>;

export const upsertPrimeContractInputSchema = z.object({
  contractValue: z.number().positive('Contract value must be positive'),
  contractType: z.string().max(100).optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  targetBudgetPercent: z.number().min(0).max(100).optional(),
  paymentTerms: paymentTermsSchema.optional(),
  estimatedStartDate: z.string().nullable().optional(),
  estimatedCompletionDate: z.string().nullable().optional(),
  actualStartDate: z.string().nullable().optional(),
  actualCompletionDate: z.string().nullable().optional(),
  executedContractDocId: z.string().nullable().optional(),
});

export type UpsertPrimeContractInput = z.infer<typeof upsertPrimeContractInputSchema>;
