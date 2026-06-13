import { z } from 'zod';

/* ---- Core lookup schema ---- */
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
    metadata: z.record(z.unknown()).nullable().optional(),
    tenantId: z.string().optional(),
    deletedAt: z.string().datetime().nullable().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough();

export type Lookup = z.infer<typeof lookupSchema>;

export const lookupListSchema = z.array(lookupSchema);

/* ---- Create schema ---- */
export const lookupCreateSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
});

export type LookupCreate = z.infer<typeof lookupCreateSchema>;

/* ---- Update schema ---- */
export const lookupUpdateSchema = z.object({
  id: z.string(),
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
});

export type LookupUpdate = z.infer<typeof lookupUpdateSchema>;

/* ---- Known lookup types ---- */
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
  'PROJECT_DIVISION',
  'PROJECT_STAGE',
  'PROJECT_CONTRACT_TYPE',
  'GC_TYPE',
  'PROFESSIONAL_ROLE',
  'PAYMENT_METHOD',
  'UNIT_OF_MEASURE',
  'PTO_TYPE',
  'TRADE_CATEGORY',
]);

export type LookupType = z.infer<typeof lookupTypeSchema>;
