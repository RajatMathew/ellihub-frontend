import { z } from 'zod';

// --- Enums ---

export const poStatusNameSchema = z.enum([
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
]);
export type POStatusName = z.infer<typeof poStatusNameSchema>;

export const tradeCategorySchema = z.enum([
  'MATERIAL',
  'FABRICATION',
  'INSTALLATION',
  'LABOR',
  'EQUIPMENT',
]);
export type TradeCategory = z.infer<typeof tradeCategorySchema>;

export const paymentTermsSchema = z.enum([
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'DUE_ON_RECEIPT',
]);
export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

// --- Status object (nested in list + detail) ---

export const poStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
  })
  .passthrough();

export type POStatus = z.infer<typeof poStatusSchema>;

// --- Vendor / Project refs ---

const vendorRefSchema = z
  .object({ id: z.string(), name: z.string() })
  .passthrough();

const projectRefSchema = z
  .object({ id: z.string(), name: z.string(), jobNumber: z.string() })
  .passthrough();

// --- List item ---

export const poListItemSchema = z
  .object({
    id: z.string(),
    poNumber: z.string().nullable().optional(),
    description: z.string(),
    tradeCategory: tradeCategorySchema,
    total: z.number(),
    totalCommitment: z.number(),
    status: poStatusSchema,
    issueDate: z.string(),
    expectedDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    vendor: vendorRefSchema,
    project: projectRefSchema,
    isOverdue: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();

export type POListItem = z.infer<typeof poListItemSchema>;

// --- Paginated response ---

export const poPaginatedResponseSchema = z.object({
  data: z.array(poListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type POPaginatedResponse = z.infer<typeof poPaginatedResponseSchema>;

// --- List params ---

export const listPOsParamsSchema = z.object({
  projectId: z.string().optional(),
  status: poStatusNameSchema.optional(),
  tradeCategory: tradeCategorySchema.optional(),
  vendorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overdue: z.literal('true').optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListPOsParams = z.infer<typeof listPOsParamsSchema>;

// --- Detail ---

export const poLineItemSchema = z
  .object({
    id: z.string(),
    purchaseOrderId: z.string(),
    lineNumber: z.number(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
    amount: z.number(),
    costCodeId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type POLineItem = z.infer<typeof poLineItemSchema>;

export const poDetailSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    vendorId: z.string(),
    rfqId: z.string().nullable().optional(),
    poNumber: z.string().nullable().optional(),
    description: z.string(),
    tradeCategory: tradeCategorySchema,
    status: poStatusSchema,
    contactName: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    leadTime: z.string().nullable().optional(),
    issueDate: z.string(),
    expectedDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    shipToAddress: z.string().nullable().optional(),
    subtotal: z.number(),
    taxPercent: z.number(),
    taxAmount: z.number(),
    total: z.number(),
    totalCommitment: z.number(),
    retainagePercent: z.number(),
    paymentTerms: paymentTermsSchema,
    notes: z.string().nullable().optional(),
    vendorNotes: z.string().nullable().optional(),
    isOverdue: z.boolean(),
    project: z.object({ id: z.string(), name: z.string(), jobNumber: z.string() }).passthrough(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough(),
    lineItems: z.array(poLineItemSchema).optional().default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type PODetail = z.infer<typeof poDetailSchema>;

// --- Line item input ---

export const poLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be > 0'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0, 'Unit price must be >= 0'),
  costCodeId: z.string().optional(),
  notes: z.string().optional(),
});

export type POLineItemInput = z.infer<typeof poLineItemInputSchema>;

// --- Create input ---

export const createPOInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  tradeCategory: tradeCategorySchema,
  description: z.string().min(1, 'Description is required'),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  leadTime: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expectedDate: z.string().optional(),
  shipToAddress: z.string().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  paymentTerms: paymentTermsSchema,
  retainagePercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  vendorNotes: z.string().optional(),
  lineItems: z.array(poLineItemInputSchema).min(1, 'At least one line item is required'),
});

export type CreatePOInput = z.infer<typeof createPOInputSchema>;
