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
  'PROFESSIONAL_ROLE',
  'CONTACT_PROFESSIONAL_ROLE',
  'VENDOR_TYPE',
  'GC_TYPE',
  'PROJECT_DIVISION',
  'PROJECT_STAGE',
  'PROJECT_CONTRACT_TYPE',
  'TRADE_CATEGORY',
  'UNIT',
  'PTO_TYPE',
  'SCO_CHANGE_TYPE',
]);

export type LookupType = z.infer<typeof lookupTypeSchema>;
