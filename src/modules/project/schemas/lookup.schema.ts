import { z } from 'zod';

export const lookupSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    label: z.string().optional(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    order: z.number().default(0),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
    metadata: z.record(z.any()).nullable().optional(),
  })
  .passthrough();

export type Lookup = z.infer<typeof lookupSchema>;

export const lookupTypeSchema = z.enum([
  'INVOICE_STATUS',
  'INVOICE_TYPE',
  'INVOICE_CATEGORY',
  'PCO_STATUS',
  'PCO_CHANGE_TYPE',
  'PCO_PRIORITY',
  'RFQ_STATUS',
  'RFQ_TYPE',
  'RFQ_TRACK',
  'SCO_CHANGE_TYPE',
  'PROJECT_STATUS',
  'PROJECT_STAGE',
  'GC_TYPE',
  'PROFESSIONAL_ROLE',
  'PAYMENT_METHOD',
  'UNIT_OF_MEASURE',
]);

export type LookupType = z.infer<typeof lookupTypeSchema>;
